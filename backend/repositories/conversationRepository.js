const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Get or create a direct conversation between two users.
 * @param {string} userId - Current user id
 * @param {string} otherUserId - Other participant id
 * @returns {Promise<Object>} Conversation with id, type, created_at
 */
async function getOrCreateDirectConversation(userId, otherUserId) {
  if (!userId || !otherUserId || userId === otherUserId) {
    throw new Error("Invalid users for direct conversation");
  }
  const [id1, id2] = [userId, otherUserId].sort();

  // Find existing: direct conversation where participants are exactly these two
  const { data: existingConvos } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", id1);

  if (existingConvos && existingConvos.length > 0) {
    const convIds = existingConvos.map((c) => c.conversation_id);
    const { data: convs } = await supabaseAdmin
      .from("conversations")
      .select("id, type, created_at")
      .eq("type", "direct")
      .in("id", convIds);

    for (const conv of convs || []) {
      const { data: participants } = await supabaseAdmin
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conv.id);
      const ids = (participants || []).map((p) => p.user_id).sort();
      if (ids[0] === id1 && ids[1] === id2) return conv;
    }
  }

  // Create new direct conversation
  const { data: newConv, error: insertConvError } = await supabaseAdmin
    .from("conversations")
    .insert({ type: "direct" })
    .select("id, type, created_at")
    .single();

  if (insertConvError) handleError(insertConvError, "createConversation");

  await supabaseAdmin.from("conversation_participants").insert([
    { conversation_id: newConv.id, user_id: userId },
    { conversation_id: newConv.id, user_id: otherUserId },
  ]);

  return newConv;
}

/**
 * Get or create a tee_time conversation. One conversation per tee_time.
 * @param {string} userId - User requesting (must be participant)
 * @param {string} teeTimeId - tee_times.id
 */
async function getOrCreateTeeTimeConversation(userId, teeTimeId) {
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id, type, created_at")
    .eq("type", "tee_time")
    .eq("tee_time_id", teeTimeId)
    .single();

  if (existing) return existing;

  const { data: newConv, error } = await supabaseAdmin
    .from("conversations")
    .insert({ type: "tee_time", tee_time_id: teeTimeId })
    .select("id, type, created_at")
    .single();

  if (error) handleError(error, "createTeeTimeConversation");
  // Add current user as participant; others can be added when they open the chat
  await supabaseAdmin
    .from("conversation_participants")
    .upsert(
      { conversation_id: newConv.id, user_id: userId },
      { onConflict: "conversation_id,user_id" }
    );
  return newConv;
}

/**
 * Get or create a group conversation. One conversation per roster_group.
 */
async function getOrCreateGroupConversation(userId, rosterGroupId) {
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id, type, created_at")
    .eq("type", "group")
    .eq("roster_group_id", rosterGroupId)
    .single();

  if (existing) return existing;

  const { data: newConv, error } = await supabaseAdmin
    .from("conversations")
    .insert({ type: "group", roster_group_id: rosterGroupId })
    .select("id, type, created_at")
    .single();

  if (error) handleError(error, "createGroupConversation");
  await supabaseAdmin
    .from("conversation_participants")
    .upsert(
      { conversation_id: newConv.id, user_id: userId },
      { onConflict: "conversation_id,user_id" }
    );
  return newConv;
}

/**
 * List conversations for a user with last message and participant info.
 */
async function listForUser(userId, options = {}) {
  const { type } = options; // 'direct' | 'tee_time' | 'group' | undefined (all)

  const { data: participantRows } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!participantRows || participantRows.length === 0) return [];

  const convIds = participantRows.map((r) => r.conversation_id);

  let query = supabaseAdmin
    .from("conversations")
    .select("id, type, tee_time_id, roster_group_id, created_at, updated_at")
    .in("id", convIds);

  if (type) query = query.eq("type", type);
  const { data: conversations, error } = await query.order("updated_at", {
    ascending: false,
  });

  if (error) handleError(error, "listConversations");

  const result = [];
  for (const conv of conversations || []) {
    const lastMessage = await getLastMessage(conv.id);
    const meta = await getConversationMeta(conv, userId, lastMessage);
    result.push({ ...conv, ...meta, lastMessage: meta.lastMessagePreview });
  }

  result.sort((a, b) => {
    const aTime = a.lastMessage?.created_at || a.updated_at;
    const bTime = b.lastMessage?.created_at || b.updated_at;
    return new Date(bTime) - new Date(aTime);
  });

  return result;
}

async function getLastMessage(conversationId) {
  const { data } = await supabaseAdmin
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function getConversationMeta(conv, userId, lastMessage) {
  let title = "";
  let subtitle = "";
  let avatarUrl = null;
  let otherUserId = null;
  let participantInitials = null;
  let participantAvatars = [];
  let participantCount = null;

  if (conv.type === "direct") {
    const { data: participants } = await supabaseAdmin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conv.id);
    const userIds = (participants || []).map((p) => p.user_id).filter((id) => id !== userId);
    otherUserId = userIds[0] || null;
    if (otherUserId) {
      const { data: u } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name")
        .eq("id", otherUserId)
        .single();
      const { data: p } = await supabaseAdmin
        .from("user_profiles")
        .select("avatar_url")
        .eq("user_id", otherUserId)
        .single();
      const profile = Array.isArray(p) ? p[0] : p;
      const user = Array.isArray(u) ? u[0] : u;
      title = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Unknown";
      avatarUrl = profile?.avatar_url || null;
    }
    subtitle = "Direct message";
  }

  if (conv.type === "tee_time" && conv.tee_time_id) {
    const { data: tt } = await supabaseAdmin
      .from("tee_times")
      .select("course_name, course_location, tee_date, tee_time")
      .eq("id", conv.tee_time_id)
      .single();
    if (tt) {
      const d = new Date(tt.tee_date);
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const day = d.getDate();
      const time = (tt.tee_time || "").toString().slice(0, 5);
      title = `${month} ${day} @ ${tt.course_name} - ${time}`;
      subtitle = tt.course_location || tt.course_name || "";
    }
    const { data: participants } = await supabaseAdmin
      .from("tee_time_participants")
      .select("user_id")
      .eq("tee_time_id", conv.tee_time_id);
    const uids = (participants || []).map((p) => p.user_id).slice(0, 3);
    participantCount = (participants || []).length;
    for (const uid of uids) {
      const { data: up } = await supabaseAdmin
        .from("user_profiles")
        .select("avatar_url")
        .eq("user_id", uid)
        .single();
      const up0 = Array.isArray(up) ? up[0] : up;
      if (up0?.avatar_url) participantAvatars.push(up0.avatar_url);
    }
    const { data: u0 } = await supabaseAdmin
      .from("users")
      .select("first_name")
      .in("id", uids)
      .limit(2);
    const names = (u0 || []).map((u) => (u.first_name || "?")[0]);
    participantInitials = names.join("").toUpperCase() || "TT";
  }

  if (conv.type === "group" && conv.roster_group_id) {
    const { data: rg } = await supabaseAdmin
      .from("roster_groups")
      .select("name, color")
      .eq("id", conv.roster_group_id)
      .single();
    if (rg) {
      title = rg.name;
      subtitle = "Group";
      participantInitials = (rg.name || "G").slice(0, 2).toUpperCase();
    }
    // Group participant avatars for list/header (Figma 1379-5818, 1269-2492)
    const { data: rosterInGroup } = await supabaseAdmin
      .from("roster")
      .select("contact_user_id")
      .eq("group_id", conv.roster_group_id)
      .limit(5);
    const memberUserIds = (rosterInGroup || []).map((r) => r.contact_user_id).filter(Boolean);
    participantCount = memberUserIds.length;
    for (const uid of memberUserIds.slice(0, 3)) {
      const { data: up } = await supabaseAdmin
        .from("user_profiles")
        .select("avatar_url")
        .eq("user_id", uid)
        .single();
      const up0 = Array.isArray(up) ? up[0] : up;
      if (up0?.avatar_url) participantAvatars.push(up0.avatar_url);
    }
  }

  const lastMessagePreview = lastMessage
    ? {
        body: lastMessage.body,
        created_at: lastMessage.created_at,
        sender_id: lastMessage.sender_id,
      }
    : null;

  return {
    title,
    subtitle,
    avatarUrl,
    otherUserId,
    participantInitials,
    participantAvatars,
    participantCount,
    lastMessagePreview,
  };
}

/**
 * Get a single conversation by id if the user is a participant.
 */
async function getById(conversationId, userId) {
  const { data: part } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!part) return null;

  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conv) return null;
  const lastMessage = await getLastMessage(conv.id);
  const meta = await getConversationMeta(conv, userId, lastMessage);
  return { ...conv, ...meta };
}

/**
 * Ensure user is in conversation (for tee_time/group, add if not already).
 */
async function ensureParticipant(conversationId, userId) {
  await supabaseAdmin.from("conversation_participants").upsert(
    { conversation_id: conversationId, user_id: userId },
    { onConflict: "conversation_id,user_id" }
  );
}

module.exports = {
  getOrCreateDirectConversation,
  getOrCreateTeeTimeConversation,
  getOrCreateGroupConversation,
  listForUser,
  getById,
  ensureParticipant,
};

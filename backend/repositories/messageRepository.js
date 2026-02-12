const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * List messages in a conversation (paginated).
 * @param {string} conversationId
 * @param {Object} options - { limit, before (created_at cursor) }
 */
async function listByConversation(conversationId, options = {}) {
  const limit = Math.min(options.limit || 50, 100);
  let query = supabaseAdmin
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (options.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;
  if (error) handleError(error, "listMessages");
  return data || [];
}

/**
 * Add a message and update conversation.updated_at.
 */
async function create(conversationId, senderId, body) {
  const { data: msg, error: msgError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: (body || "").trim(),
    })
    .select("id, conversation_id, sender_id, body, created_at")
    .single();

  if (msgError) handleError(msgError, "createMessage");

  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return msg;
}

/**
 * Get sender display info for messages (batch by sender_id).
 */
async function getSendersInfo(senderIds) {
  if (!senderIds || senderIds.length === 0) return {};
  const uniq = [...new Set(senderIds)];

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, first_name, last_name")
    .in("id", uniq);

  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, avatar_url")
    .in("user_id", uniq);

  const byId = {};
  for (const u of users || []) {
    byId[u.id] = {
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unknown",
      avatarUrl: null,
    };
  }
  for (const p of profiles || []) {
    if (byId[p.user_id]) byId[p.user_id].avatarUrl = p.avatar_url;
  }
  return byId;
}

module.exports = {
  listByConversation,
  create,
  getSendersInfo,
};

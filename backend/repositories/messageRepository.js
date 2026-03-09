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
    .select("id, conversation_id, sender_id, body, image_url, created_at")
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
 * @param {string} [senderId] - User ID; null for system messages (e.g. Tee Time Social welcome)
 * @param {string} [imageUrl] - Optional public URL of attached image
 */
async function create(conversationId, senderId, body, imageUrl = null) {
  const payload = {
    conversation_id: conversationId,
    body: (body || "").trim(),
    image_url: imageUrl || null,
  };
  if (senderId != null) payload.sender_id = senderId;
  const { data: msg, error: msgError } = await supabaseAdmin
    .from("messages")
    .insert(payload)
    .select("id, conversation_id, sender_id, body, image_url, created_at")
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

/**
 * Convert a system message (sender_id IS NULL) into a group message by setting sender_id.
 * Only updates when the message exists in the conversation and has no sender (auto-generated).
 * @returns Updated message row or null if not found / not a system message
 */
async function updateSender(messageId, conversationId, senderId) {
  const { data: msg, error } = await supabaseAdmin
    .from("messages")
    .update({ sender_id: senderId })
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .is("sender_id", null)
    .select("id, conversation_id, sender_id, body, image_url, created_at")
    .single();

  if (error || !msg) return null;
  return msg;
}

/**
 * Get a single message by id and conversation (for permission checks).
 */
async function getOne(messageId, conversationId) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single();
  if (error || !data) return null;
  return data;
}

/**
 * Delete a message. Returns true if a row was deleted. Updates conversation.updated_at.
 */
async function deleteOne(messageId, conversationId) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .select("id")
    .single();
  if (error) handleError(error, "deleteMessage");
  if (data) {
    await supabaseAdmin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }
  return !!data;
}

module.exports = {
  listByConversation,
  create,
  getSendersInfo,
  updateSender,
  getOne,
  deleteOne,
};

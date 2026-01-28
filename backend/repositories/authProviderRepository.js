const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

/**
 * Auth Provider Repository
 * Manages OAuth provider links for users
 */

/**
 * Find provider link by provider and provider_user_id
 */
const findByProvider = async (provider, providerUserId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("auth_providers")
      .select("*, users(*)")
      .eq("provider", provider)
      .eq("provider_user_id", providerUserId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (error) {
    logger.error("Error finding provider link:", error);
    throw error;
  }
};

/**
 * Find all providers for a user
 */
const findByUserId = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("auth_providers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Error finding user providers:", error);
    throw error;
  }
};

/**
 * Create a new provider link
 */
const create = async ({
  userId,
  provider,
  providerUserId,
  providerEmail,
  providerData = {},
}) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("auth_providers")
      .insert({
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
        provider_email: providerEmail,
        provider_data: providerData,
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Error creating provider link:", error);
    throw error;
  }
};

/**
 * Update last used timestamp
 */
const updateLastUsed = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("auth_providers")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Error updating provider last used:", error);
    throw error;
  }
};

/**
 * Delete a provider link
 */
const deleteProvider = async (userId, provider) => {
  try {
    const { error } = await supabaseAdmin
      .from("auth_providers")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error("Error deleting provider link:", error);
    throw error;
  }
};

/**
 * Check if user has a specific provider linked
 */
const hasProvider = async (userId, provider) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("auth_providers")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  } catch (error) {
    logger.error("Error checking provider:", error);
    return false;
  }
};

module.exports = {
  findByProvider,
  findByUserId,
  create,
  updateLastUsed,
  deleteProvider,
  hasProvider,
};

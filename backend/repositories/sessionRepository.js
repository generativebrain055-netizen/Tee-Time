const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Session Repository - Supabase REST API
 */

const create = async (sessionData) => {
  const {
    userId, deviceId, accessTokenHash, refreshTokenHash, tokenFamilyId,
    ipAddress, userAgent, expiresAt, rememberMe,
  } = sessionData;

  try {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .insert({
        user_id: userId,
        device_id: deviceId || null,
        access_token_hash: accessTokenHash,
        refresh_token_hash: refreshTokenHash,
        token_family_id: tokenFamilyId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        remember_me: rememberMe || false,
      })
      .select("id, user_id, device_id, token_family_id, created_at, expires_at, is_active")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "create session");
  }
};

const findByAccessToken = async (tokenHash) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select(`*, users!sessions_user_id_fkey (phone_number, email, is_active)`)
      .eq("access_token_hash", tokenHash)
      .eq("is_active", true)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    const user = data.users;
    delete data.users;
    return { ...data, ...user, user_is_active: user.is_active };
  } catch (error) {
    handleError(error, "findByAccessToken");
  }
};

const findByRefreshToken = async (tokenHash) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select(`*, users!sessions_user_id_fkey (phone_number, email, is_active)`)
      .eq("refresh_token_hash", tokenHash)
      .eq("is_active", true)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    const user = data.users;
    delete data.users;
    return { ...data, ...user, user_is_active: user.is_active };
  } catch (error) {
    handleError(error, "findByRefreshToken");
  }
};

const findByUserId = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select(`
        id, device_id, ip_address, user_agent, created_at, last_activity_at,
        expires_at, remember_me, devices (device_name, device_type, os)
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("last_activity_at", { ascending: false });

    if (error) throw error;
    return data.map(session => {
      const device = session.devices?.[0] || {};
      delete session.devices;
      return { ...session, ...device };
    });
  } catch (error) {
    handleError(error, "findByUserId");
  }
};

const updateTokens = async (sessionId, newAccessTokenHash, newRefreshTokenHash, newExpiresAt) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .update({
        access_token_hash: newAccessTokenHash,
        refresh_token_hash: newRefreshTokenHash,
        expires_at: newExpiresAt,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .select("id, user_id, device_id, token_family_id, expires_at")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "updateTokens");
  }
};

const updateLastActivity = async (sessionId) => {
  try {
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) throw error;
  } catch (error) {
    handleError(error, "updateLastActivity");
  }
};

const revoke = async (sessionId, revokedBy = null, reason = null) => {
  try {
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        revoke_reason: reason,
      })
      .eq("id", sessionId);

    if (error) throw error;
  } catch (error) {
    handleError(error, "revoke session");
  }
};

const revokeAllForUser = async (userId, exceptSessionId = null, reason = "logout_all") => {
  try {
    let query = supabaseAdmin
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
      })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (exceptSessionId) {
      query = query.neq("id", exceptSessionId);
    }

    const { data, error } = await query.select("id");
    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    handleError(error, "revokeAllForUser");
  }
};

const revokeByTokenFamily = async (tokenFamilyId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: "token_theft_detected",
      })
      .eq("token_family_id", tokenFamilyId)
      .eq("is_active", true)
      .select("id");

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    handleError(error, "revokeByTokenFamily");
  }
};

const deleteExpired = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .delete()
      .or(`expires_at.lt.${new Date().toISOString()},and(is_active.eq.false,revoked_at.lt.${thirtyDaysAgo})`)
      .select("id");

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    handleError(error, "deleteExpired");
  }
};

const getUserSessionStats = async (userId) => {
  try {
    const { count: activeSessions } = await supabaseAdmin
      .from("sessions")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString());

    const { count: revokedSessions } = await supabaseAdmin
      .from("sessions")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .eq("is_active", false)
      .not("revoked_at", "is", null);

    return {
      active_sessions: activeSessions || 0,
      revoked_sessions: revokedSessions || 0,
    };
  } catch (error) {
    handleError(error, "getUserSessionStats");
  }
};

const getGlobalStats = async () => {
  try {
    const { count: activeSessions } = await supabaseAdmin
      .from("sessions")
      .select("*", { count: 'exact', head: true })
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString());

    return { active_sessions: activeSessions || 0 };
  } catch (error) {
    handleError(error, "getGlobalStats");
  }
};

const isValid = async (sessionId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("id", { count: 'exact', head: true })
      .eq("id", sessionId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString());

    if (error) throw error;
    return data !== null;
  } catch (error) {
    handleError(error, "isValid");
  }
};

module.exports = {
  create, findByAccessToken, findByRefreshToken, findByUserId,
  updateTokens, updateLastActivity, revoke, revokeAllForUser,
  revokeByTokenFamily, deleteExpired, getUserSessionStats,
  getGlobalStats, isValid,
};

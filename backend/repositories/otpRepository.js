const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * OTP Repository - Supabase REST API
 */

const create = async (otpData) => {
  const {
    phoneNumber, otpCodeHash, purpose, expiresAt,
    ipAddress, deviceFingerprint, maxAttempts = 5,
  } = otpData;

  try {
    // Explicitly set user_id to null to avoid FK issues
    const insertData = {
      phone_number: phoneNumber,
      user_id: null,
      otp_code_hash: otpCodeHash,
      purpose,
      expires_at: expiresAt,
      ip_address: ipAddress || null,
      device_fingerprint: deviceFingerprint || null,
      max_attempts: maxAttempts,
    };

    const { data, error } = await supabaseAdmin
      .from("otp_requests")
      .insert(insertData)
      .select("id, phone_number, purpose, attempts, max_attempts, created_at, expires_at")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "create OTP");
  }
};

const findLatestValid = async (phoneNumber, purpose) => {
  try {
    const { data, error} = await supabaseAdmin
      .from("otp_requests")
      .select("id, phone_number, user_id, otp_code_hash, purpose, attempts, max_attempts, is_verified, expires_at, created_at")
      .eq("phone_number", phoneNumber)
      .eq("purpose", purpose)
      .eq("is_verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    handleError(error, "findLatestValid OTP");
  }
};

const incrementAttempts = async (otpId) => {
  try {
    // Get current attempts
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("otp_requests")
      .select("attempts")
      .eq("id", otpId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabaseAdmin
      .from("otp_requests")
      .update({ attempts: (current.attempts || 0) + 1 })
      .eq("id", otpId)
      .select("id, attempts, max_attempts")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "incrementAttempts");
  }
};

const markAsVerified = async (otpId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("otp_requests")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", otpId)
      .select("id, phone_number, user_id, purpose, verified_at")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "markAsVerified");
  }
};

const countRecentRequests = async (phoneNumber, windowMinutes = 60) => {
  try {
    const windowTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("otp_requests")
      .select("*", { count: 'exact', head: true })
      .eq("phone_number", phoneNumber)
      .gt("created_at", windowTime);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    handleError(error, "countRecentRequests");
  }
};

const countRecentRequestsByIp = async (ipAddress, windowMinutes = 60) => {
  try {
    const windowTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("otp_requests")
      .select("*", { count: 'exact', head: true })
      .eq("ip_address", ipAddress)
      .gt("created_at", windowTime);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    handleError(error, "countRecentRequestsByIp");
  }
};

const deleteExpired = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from("otp_requests")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .eq("is_verified", false)
      .select("id");

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    handleError(error, "deleteExpired");
  }
};

const getStatistics = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: totalRequests } = await supabaseAdmin
      .from("otp_requests")
      .select("*", { count: 'exact', head: true })
      .gt("created_at", thirtyDaysAgo);

    const { count: verifiedRequests } = await supabaseAdmin
      .from("otp_requests")
      .select("*", { count: 'exact', head: true })
      .eq("is_verified", true)
      .gt("created_at", thirtyDaysAgo);

    return {
      total_requests: totalRequests || 0,
      verified_requests: verifiedRequests || 0,
      verification_rate_percentage: totalRequests ? ((verifiedRequests / totalRequests) * 100).toFixed(2) : 0,
    };
  } catch (error) {
    handleError(error, "getStatistics");
  }
};

const logger = require("../config/logger");
const getStatisticsByPurpose = async () => {
  try {
    // Note: Supabase doesn't support GROUP BY directly via REST API
    // This would need to be implemented as a PostgreSQL function
    logger.warn("getStatisticsByPurpose: Consider implementing as PostgreSQL function for better performance");
    return [];
  } catch (error) {
    handleError(error, "getStatisticsByPurpose");
  }
};

const isPhoneRateLimited = async (phoneNumber, maxPerHour = 5) => {
  const count = await countRecentRequests(phoneNumber, 60);
  return count >= maxPerHour;
};

const isIpRateLimited = async (ipAddress, maxPerHour = 10) => {
  const count = await countRecentRequestsByIp(ipAddress, 60);
  return count >= maxPerHour;
};

module.exports = {
  create,
  findLatestValid,
  incrementAttempts,
  markAsVerified,
  countRecentRequests,
  countRecentRequestsByIp,
  deleteExpired,
  getStatistics,
  getStatisticsByPurpose,
  isPhoneRateLimited,
  isIpRateLimited,
};

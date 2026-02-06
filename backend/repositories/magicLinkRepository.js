const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Magic Link Repository - Supabase REST API
 * Handles all database operations related to magic link authentication
 */

/**
 * Create a new magic link
 * @param {Object} linkData
 * @returns {Promise<Object>}
 */
const create = async (linkData) => {
    const {
        userId,
        email,
        phoneNumber,
        tokenHash,
        purpose,
        expiresAt,
        ipAddress,
        userAgent,
        deviceFingerprint,
        maxAttempts = 3,
        metadata = null,
    } = linkData;

    try {
        const { data, error } = await supabaseAdmin
            .from("magic_links")
            .insert({
                user_id: userId || null,
                email: email || null,
                phone_number: phoneNumber || null,
                token_hash: tokenHash,
                purpose,
                expires_at: expiresAt,
                ip_address: ipAddress || null,
                user_agent: userAgent || null,
                device_fingerprint: deviceFingerprint || null,
                max_attempts: maxAttempts,
                metadata: metadata || null,
            })
            .select("id, email, phone_number, purpose, created_at, expires_at, metadata")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "create magic link");
    }
};

/**
 * Find magic link by token hash
 * @param {string} tokenHash
 * @returns {Promise<Object|null>}
 */
const findByTokenHash = async (tokenHash) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("magic_links")
            .select("id, user_id, email, phone_number, purpose, attempts, max_attempts, is_used, used_at, created_at, expires_at, metadata")
            .eq("token_hash", tokenHash)
            .eq("is_used", false)
            .gt("expires_at", new Date().toISOString())
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (error) {
        handleError(error, "findByTokenHash");
    }
};

/**
 * Increment magic link attempt counter
 * @param {string} linkId
 * @returns {Promise<Object>}
 */
const incrementAttempts = async (linkId) => {
    try {
        // Get current attempts
        const { data: current, error: fetchError } = await supabaseAdmin
            .from("magic_links")
            .select("attempts")
            .eq("id", linkId)
            .single();

        if (fetchError) throw fetchError;

        const { data, error } = await supabaseAdmin
            .from("magic_links")
            .update({ attempts: (current.attempts || 0) + 1 })
            .eq("id", linkId)
            .select("id, attempts, max_attempts")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "incrementAttempts");
    }
};

/**
 * Mark magic link as used
 * @param {string} linkId
 * @returns {Promise<Object>}
 */
const markAsUsed = async (linkId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("magic_links")
            .update({
                is_used: true,
                used_at: new Date().toISOString(),
            })
            .eq("id", linkId)
            .select("id, email, user_id, purpose, used_at")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "markAsUsed");
    }
};

/**
 * Count recent magic link requests for email
 * @param {string} email
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequests = async (email, windowMinutes = 60) => {
    try {
        const windowTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
        const { count, error } = await supabaseAdmin
            .from("magic_links")
            .select("*", { count: 'exact', head: true })
            .eq("email", email)
            .gt("created_at", windowTime);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        handleError(error, "countRecentRequests");
    }
};

/**
 * Count recent magic link requests by IP
 * @param {string} ipAddress
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequestsByIp = async (ipAddress, windowMinutes = 60) => {
    try {
        const windowTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
        const { count, error } = await supabaseAdmin
            .from("magic_links")
            .select("*", { count: 'exact', head: true })
            .eq("ip_address", ipAddress)
            .gt("created_at", windowTime);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        handleError(error, "countRecentRequestsByIp");
    }
};

/**
 * Count recent magic link requests for phone number
 * @param {string} phoneNumber
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
const countRecentRequestsByPhone = async (phoneNumber, windowMinutes = 60) => {
    try {
        const windowTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
        const { count, error } = await supabaseAdmin
            .from("magic_links")
            .select("*", { count: 'exact', head: true })
            .eq("phone_number", phoneNumber)
            .gt("created_at", windowTime);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        handleError(error, "countRecentRequestsByPhone");
    }
};

/**
 * Delete expired magic links
 * @returns {Promise<number>} Number of deleted records
 */
const deleteExpired = async () => {
    try {
        const { data, error } = await supabaseAdmin
            .from("magic_links")
            .delete()
            .lt("expires_at", new Date().toISOString())
            .eq("is_used", false)
            .select("id");

        if (error) throw error;
        return data?.length || 0;
    } catch (error) {
        handleError(error, "deleteExpired");
    }
};

/**
 * Invalidate all unused magic links for user
 * @param {string} userId
 * @returns {Promise<number>}
 */
const invalidateAllForUser = async (userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("magic_links")
            .update({
                is_used: true,
                used_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("is_used", false)
            .select("id");

        if (error) throw error;
        return data?.length || 0;
    } catch (error) {
        handleError(error, "invalidateAllForUser");
    }
};

/**
 * Get magic link statistics
 * @returns {Promise<Object>}
 */
const getStatistics = async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { count: totalLinks } = await supabaseAdmin
            .from("magic_links")
            .select("*", { count: 'exact', head: true })
            .gt("created_at", thirtyDaysAgo);

        const { count: usedLinks } = await supabaseAdmin
            .from("magic_links")
            .select("*", { count: 'exact', head: true })
            .eq("is_used", true)
            .gt("created_at", thirtyDaysAgo);

        const { count: expiredLinks } = await supabaseAdmin
            .from("magic_links")
            .select("*", { count: 'exact', head: true })
            .eq("is_used", false)
            .lt("expires_at", new Date().toISOString())
            .gt("created_at", thirtyDaysAgo);

        return {
            total_links: totalLinks || 0,
            used_links: usedLinks || 0,
            expired_links: expiredLinks || 0,
            usage_rate_percentage: totalLinks ? ((usedLinks / totalLinks) * 100).toFixed(2) : 0,
        };
    } catch (error) {
        handleError(error, "getStatistics");
    }
};

/**
 * Get magic link statistics by purpose
 * @returns {Promise<Array>}
 */
const getStatisticsByPurpose = async () => {
    try {
        // Note: GROUP BY aggregations need PostgreSQL function for better performance
        console.warn("getStatisticsByPurpose: Consider implementing as PostgreSQL function");
        return [];
    } catch (error) {
        handleError(error, "getStatisticsByPurpose");
    }
};

/**
 * Check if email is being rate limited
 * @param {string} email
 * @param {number} maxPerHour
 * @returns {Promise<boolean>}
 */
const isEmailRateLimited = async (email, maxPerHour = 3) => {
    const count = await countRecentRequests(email, 60);
    return count >= maxPerHour;
};

/**
 * Check if phone is being rate limited
 * @param {string} phoneNumber
 * @param {number} maxPerHour
 * @returns {Promise<boolean>}
 */
const isPhoneRateLimited = async (phoneNumber, maxPerHour = 3) => {
    const count = await countRecentRequestsByPhone(phoneNumber, 60);
    return count >= maxPerHour;
};

/**
 * Find recently verified magic link for phone (used for register validation)
 * @param {string} phoneNumber
 * @param {number} windowMinutes - how recently used_at must be (default 60)
 * @returns {Promise<Object|null>}
 */
const findRecentlyVerifiedByPhone = async (phoneNumber, windowMinutes = 60) => {
    try {
        const windowTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
            .from("magic_links")
            .select("id, phone_number, used_at")
            .eq("phone_number", phoneNumber)
            .eq("purpose", "signup")
            .eq("is_used", true)
            .gte("used_at", windowTime)
            .order("used_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "findRecentlyVerifiedByPhone");
    }
};

module.exports = {
    create,
    findByTokenHash,
    incrementAttempts,
    markAsUsed,
    countRecentRequests,
    countRecentRequestsByIp,
    countRecentRequestsByPhone,
    findRecentlyVerifiedByPhone,
    deleteExpired,
    invalidateAllForUser,
    getStatistics,
    getStatisticsByPurpose,
    isEmailRateLimited,
    isPhoneRateLimited,
};

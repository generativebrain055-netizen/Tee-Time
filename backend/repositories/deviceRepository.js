const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Device Repository - Supabase REST API
 * Handles all database operations related to device tracking
 */

/**
 * Create or update device
 * @param {Object} deviceData
 * @returns {Promise<Object>}
 */
const upsert = async (deviceData) => {
    const {
        userId,
        deviceFingerprint,
        deviceName,
        deviceType,
        os,
        osVersion,
        browser,
        browserVersion,
        appVersion,
        ipAddress,
        pushToken,
        pushPlatform,
    } = deviceData;

    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .upsert({
                user_id: userId,
                device_fingerprint: deviceFingerprint,
                device_name: deviceName || null,
                device_type: deviceType || null,
                os: os || null,
                os_version: osVersion || null,
                browser: browser || null,
                browser_version: browserVersion || null,
                app_version: appVersion || null,
                last_ip_address: ipAddress || null,
                push_token: pushToken || null,
                push_platform: pushPlatform || null,
                last_seen_at: new Date().toISOString(),
            }, {
                onConflict: 'device_fingerprint',
                ignoreDuplicates: false,
            })
            .select("id, user_id, device_fingerprint, device_name, device_type, is_trusted, is_blocked, last_seen_at")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "upsert device");
    }
};

/**
 * Find device by fingerprint
 * @param {string} deviceFingerprint
 * @returns {Promise<Object|null>}
 */
const findByFingerprint = async (deviceFingerprint) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .select("*")
            .eq("device_fingerprint", deviceFingerprint)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (error) {
        handleError(error, "findByFingerprint");
    }
};

/**
 * Find device by ID
 * @param {string} deviceId
 * @returns {Promise<Object|null>}
 */
const findById = async (deviceId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .select("*")
            .eq("id", deviceId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (error) {
        handleError(error, "findById");
    }
};

/**
 * Find all devices for a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const findByUserId = async (userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .select(`
                id, device_fingerprint, device_name, device_type,
                os, os_version, browser, browser_version, app_version,
                is_trusted, is_blocked, last_ip_address, last_seen_at, created_at
            `)
            .eq("user_id", userId)
            .eq("is_blocked", false)
            .order("last_seen_at", { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        handleError(error, "findByUserId");
    }
};

/**
 * Find all devices with push tokens for a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const findDevicesWithPushTokens = async (userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .select("id, push_token, push_platform, device_name, device_type")
            .eq("user_id", userId)
            .eq("is_blocked", false)
            .not("push_token", "is", null);

        if (error) throw error;
        return data || [];
    } catch (error) {
        handleError(error, "findDevicesWithPushTokens");
    }
};

/**
 * Mark device as trusted
 * @param {string} deviceId
 * @returns {Promise<Object>}
 */
const markAsTrusted = async (deviceId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .update({
                is_trusted: true,
                trusted_at: new Date().toISOString(),
            })
            .eq("id", deviceId)
            .select("id, device_fingerprint, is_trusted, trusted_at")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "markAsTrusted");
    }
};

/**
 * Block device
 * @param {string} deviceId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
const blockDevice = async (deviceId, reason) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .update({
                is_blocked: true,
                blocked_at: new Date().toISOString(),
                block_reason: reason,
            })
            .eq("id", deviceId)
            .select("id, device_fingerprint, is_blocked, blocked_at, block_reason")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "blockDevice");
    }
};

/**
 * Unblock device
 * @param {string} deviceId
 * @returns {Promise<Object>}
 */
const unblockDevice = async (deviceId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .update({
                is_blocked: false,
                blocked_at: null,
                block_reason: null,
            })
            .eq("id", deviceId)
            .select("id, device_fingerprint, is_blocked")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "unblockDevice");
    }
};

/**
 * Update device push token
 * @param {string} deviceId
 * @param {string} pushToken
 * @param {string} pushPlatform
 * @returns {Promise<Object>}
 */
const updatePushToken = async (deviceId, pushToken, pushPlatform) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .update({
                push_token: pushToken,
                push_platform: pushPlatform,
            })
            .eq("id", deviceId)
            .select("id, push_token, push_platform")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "updatePushToken");
    }
};

/**
 * Update last seen timestamp
 * @param {string} deviceId
 * @param {string} ipAddress
 * @returns {Promise<void>}
 */
const updateLastSeen = async (deviceId, ipAddress) => {
    try {
        const { error } = await supabaseAdmin
            .from("devices")
            .update({
                last_seen_at: new Date().toISOString(),
                last_ip_address: ipAddress,
            })
            .eq("id", deviceId);

        if (error) throw error;
    } catch (error) {
        handleError(error, "updateLastSeen");
    }
};

/**
 * Delete device
 * @param {string} deviceId
 * @returns {Promise<void>}
 */
const deleteDevice = async (deviceId) => {
    try {
        const { error } = await supabaseAdmin
            .from("devices")
            .delete()
            .eq("id", deviceId);

        if (error) throw error;
    } catch (error) {
        handleError(error, "deleteDevice");
    }
};

/**
 * Get device statistics
 * @returns {Promise<Object>}
 */
const getStatistics = async () => {
    try {
        const { count: totalDevices } = await supabaseAdmin
            .from("devices")
            .select("*", { count: 'exact', head: true });

        const { count: trustedDevices } = await supabaseAdmin
            .from("devices")
            .select("*", { count: 'exact', head: true })
            .eq("is_trusted", true);

        const { count: blockedDevices } = await supabaseAdmin
            .from("devices")
            .select("*", { count: 'exact', head: true })
            .eq("is_blocked", true);

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: active24h } = await supabaseAdmin
            .from("devices")
            .select("*", { count: 'exact', head: true })
            .gt("last_seen_at", twentyFourHoursAgo);

        return {
            total_devices: totalDevices || 0,
            trusted_devices: trustedDevices || 0,
            blocked_devices: blockedDevices || 0,
            active_24h: active24h || 0,
        };
    } catch (error) {
        handleError(error, "getStatistics");
    }
};

/**
 * Get device distribution by type
 * @returns {Promise<Array>}
 */
const getDeviceTypeDistribution = async () => {
    try {
        // Note: GROUP BY aggregations need to be done via PostgreSQL function
        // This is a simplified version
        const { data, error } = await supabaseAdmin
            .from("devices")
            .select("device_type")
            .not("device_type", "is", null)
            .eq("is_blocked", false);

        if (error) throw error;

        // Group manually
        const distribution = {};
        data.forEach(d => {
            distribution[d.device_type] = (distribution[d.device_type] || 0) + 1;
        });

        return Object.entries(distribution).map(([device_type, count]) => ({
            device_type,
            count,
        }));
    } catch (error) {
        handleError(error, "getDeviceTypeDistribution");
    }
};

/**
 * Get OS distribution
 * @returns {Promise<Array>}
 */
const getOsDistribution = async () => {
    try {
        const { data, error } = await supabaseAdmin
            .from("devices")
            .select("os, os_version")
            .not("os", "is", null)
            .eq("is_blocked", false)
            .limit(20);

        if (error) throw error;

        // Group manually
        const distribution = {};
        data.forEach(d => {
            const key = `${d.os} ${d.os_version || ''}`.trim();
            distribution[key] = (distribution[key] || 0) + 1;
        });

        return Object.entries(distribution).map(([key, count]) => {
            const [os, os_version] = key.split(' ');
            return { os, os_version: os_version || null, count };
        });
    } catch (error) {
        handleError(error, "getOsDistribution");
    }
};

/**
 * Find devices with suspicious activity
 * @param {number} maxDevicesPerUser
 * @returns {Promise<Array>}
 */
const findSuspiciousDevices = async (maxDevicesPerUser = 10) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        // Get all recent devices
        const { data, error } = await supabaseAdmin
            .from("devices")
            .select("user_id")
            .eq("is_blocked", false)
            .gt("created_at", sevenDaysAgo);

        if (error) throw error;

        // Count devices per user
        const userDeviceCounts = {};
        data.forEach(d => {
            userDeviceCounts[d.user_id] = (userDeviceCounts[d.user_id] || 0) + 1;
        });

        // Filter suspicious users
        return Object.entries(userDeviceCounts)
            .filter(([_, count]) => count > maxDevicesPerUser)
            .map(([user_id, device_count]) => ({ user_id, device_count }))
            .sort((a, b) => b.device_count - a.device_count);
    } catch (error) {
        handleError(error, "findSuspiciousDevices");
    }
};

module.exports = {
    upsert,
    findByFingerprint,
    findById,
    findByUserId,
    findDevicesWithPushTokens,
    markAsTrusted,
    blockDevice,
    unblockDevice,
    updatePushToken,
    updateLastSeen,
    deleteDevice,
    getStatistics,
    getDeviceTypeDistribution,
    getOsDistribution,
    findSuspiciousDevices,
};

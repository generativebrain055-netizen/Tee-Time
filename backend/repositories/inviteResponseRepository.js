const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Invite Response Repository - Supabase REST API
 * Handles all database operations related to invite responses
 */

/**
 * Create a new invite response
 * @param {Object} responseData
 * @returns {Promise<Object>}
 */
const create = async (responseData) => {
    const {
        inviteId,
        userId,
        response,
        responseMessage,
        respondedVia,
        ipAddress,
        deviceInfo,
    } = responseData;

    try {
        const { data, error } = await supabaseAdmin
            .from("invite_responses")
            .insert({
                invite_id: inviteId,
                user_id: userId || null,
                response,
                response_message: responseMessage || null,
                responded_via: respondedVia || 'app',
                ip_address: ipAddress || null,
                device_info: deviceInfo || null,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "create invite response");
    }
};

/**
 * Find all responses for an invite
 * @param {string} inviteId
 * @returns {Promise<Array>}
 */
const findByInviteId = async (inviteId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("invite_responses")
            .select(`
                *,
                users (first_name, last_name, phone_number)
            `)
            .eq("invite_id", inviteId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        
        return (data || []).map(response => {
            const user = response.users || {};
            delete response.users;
            return { ...response, ...user };
        });
    } catch (error) {
        handleError(error, "findByInviteId");
    }
};

/**
 * Find all responses by a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const findByUserId = async (userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("invite_responses")
            .select(`
                *,
                invites!inner (
                    tee_time_id,
                    tee_times (course_name, tee_date, tee_time)
                )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        
        return (data || []).map(response => {
            const invite = response.invites || {};
            const teeTime = invite.tee_times || {};
            delete response.invites;
            return {
                ...response,
                tee_time_id: invite.tee_time_id,
                course_name: teeTime.course_name,
                tee_date: teeTime.tee_date,
                tee_time: teeTime.tee_time,
            };
        });
    } catch (error) {
        handleError(error, "findByUserId");
    }
};

/**
 * Get the latest response for an invite by a user
 * @param {string} inviteId
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const getLatestResponse = async (inviteId, userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("invite_responses")
            .select("*")
            .eq("invite_id", inviteId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (error) {
        handleError(error, "getLatestResponse");
    }
};

/**
 * Count responses by type for an invite
 * @param {string} inviteId
 * @returns {Promise<Object>}
 */
const countResponsesByType = async (inviteId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("invite_responses")
            .select("response")
            .eq("invite_id", inviteId);

        if (error) throw error;

        const counts = {
            accepted: 0,
            declined: 0,
            maybe: 0,
            waitlist: 0,
        };

        (data || []).forEach(row => {
            if (counts.hasOwnProperty(row.response)) {
                counts[row.response]++;
            }
        });

        return counts;
    } catch (error) {
        handleError(error, "countResponsesByType");
    }
};

/**
 * Get response history for a tee time
 * @param {string} teeTimeId
 * @returns {Promise<Array>}
 */
const getResponseHistoryForTeeTime = async (teeTimeId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("invite_responses")
            .select(`
                *,
                invites!inner (
                    invitee_name,
                    invitee_phone,
                    tee_time_id
                ),
                users (first_name, last_name)
            `)
            .eq("invites.tee_time_id", teeTimeId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (data || []).map(response => {
            const invite = response.invites || {};
            const user = response.users || {};
            delete response.invites;
            delete response.users;
            return {
                ...response,
                invitee_name: invite.invitee_name,
                invitee_phone: invite.invitee_phone,
                first_name: user.first_name,
                last_name: user.last_name,
            };
        });
    } catch (error) {
        handleError(error, "getResponseHistoryForTeeTime");
    }
};

module.exports = {
    create,
    findByInviteId,
    findByUserId,
    getLatestResponse,
    countResponsesByType,
    getResponseHistoryForTeeTime,
};

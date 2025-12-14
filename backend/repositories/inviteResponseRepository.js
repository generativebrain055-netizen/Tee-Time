const { query } = require("../config/database");

/**
 * Invite Response Repository
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

    const result = await query(
        `INSERT INTO invite_responses (
            invite_id, user_id, response, response_message, responded_via, ip_address, device_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            inviteId,
            userId || null,
            response,
            responseMessage || null,
            respondedVia || 'app',
            ipAddress || null,
            deviceInfo ? JSON.stringify(deviceInfo) : null,
        ]
    );

    return result.rows[0];
};

/**
 * Find all responses for an invite
 * @param {string} inviteId
 * @returns {Promise<Array>}
 */
const findByInviteId = async (inviteId) => {
    const result = await query(
        `SELECT ir.*, u.first_name, u.last_name, u.phone_number
         FROM invite_responses ir
         LEFT JOIN users u ON ir.user_id = u.id
         WHERE ir.invite_id = $1
         ORDER BY ir.created_at DESC`,
        [inviteId]
    );
    return result.rows;
};

/**
 * Find all responses by a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const findByUserId = async (userId) => {
    const result = await query(
        `SELECT ir.*, i.tee_time_id, tt.course_name, tt.tee_date, tt.tee_time
         FROM invite_responses ir
         JOIN invites i ON ir.invite_id = i.id
         JOIN tee_times tt ON i.tee_time_id = tt.id
         WHERE ir.user_id = $1
         ORDER BY ir.created_at DESC`,
        [userId]
    );
    return result.rows;
};

/**
 * Get the latest response for an invite by a user
 * @param {string} inviteId
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const getLatestResponse = async (inviteId, userId) => {
    const result = await query(
        `SELECT * FROM invite_responses 
         WHERE invite_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [inviteId, userId]
    );
    return result.rows[0] || null;
};

/**
 * Count responses by type for an invite
 * @param {string} inviteId
 * @returns {Promise<Object>}
 */
const countResponsesByType = async (inviteId) => {
    const result = await query(
        `SELECT 
            response,
            COUNT(*) as count
         FROM invite_responses
         WHERE invite_id = $1
         GROUP BY response`,
        [inviteId]
    );
    
    const counts = {
        accepted: 0,
        declined: 0,
        maybe: 0,
        waitlist: 0,
    };
    
    result.rows.forEach(row => {
        counts[row.response] = parseInt(row.count);
    });
    
    return counts;
};

/**
 * Get response history for a tee time
 * @param {string} teeTimeId
 * @returns {Promise<Array>}
 */
const getResponseHistoryForTeeTime = async (teeTimeId) => {
    const result = await query(
        `SELECT ir.*, i.invitee_name, i.invitee_phone, u.first_name, u.last_name
         FROM invite_responses ir
         JOIN invites i ON ir.invite_id = i.id
         LEFT JOIN users u ON ir.user_id = u.id
         WHERE i.tee_time_id = $1
         ORDER BY ir.created_at DESC`,
        [teeTimeId]
    );
    return result.rows;
};

module.exports = {
    create,
    findByInviteId,
    findByUserId,
    getLatestResponse,
    countResponsesByType,
    getResponseHistoryForTeeTime,
};

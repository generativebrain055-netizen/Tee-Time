/**
 * Invite query handlers
 */
const inviteRepository = require("../../../repositories/inviteRepository");
const logger = require("../../../config/logger");

/**
 * Get pending invites for user
 */
const getPendingInvites = async (req, res) => {
    try {
        const userId = req.user.id;
        const invites = await inviteRepository.getPendingInvites(userId);

        const formatted = invites.map(i => ({
            id: i.id,
            teeTimeId: i.tee_time_id,
            courseName: i.course_name,
            courseLocation: i.course_location,
            teeDate: i.tee_date,
            teeTime: i.tee_time,
            inviteType: i.invite_type,
            maxPlayers: i.max_players,
            inviter: {
                firstName: i.inviter_first_name,
                lastName: i.inviter_last_name,
                avatar: i.inviter_avatar
            },
            createdAt: i.created_at
        }));

        res.json({ success: true, invites: formatted });
    } catch (error) {
        logger.error("Get pending invites error:", error);
        res.status(500).json({ success: false, message: "Failed to get pending invites" });
    }
};

/**
 * Get sent invites by user
 */
const getSentInvites = async (req, res) => {
    try {
        const userId = req.user.id;
        const invites = await inviteRepository.getSentInvites(userId);

        const formatted = invites.map(i => ({
            id: i.id,
            teeTimeId: i.tee_time_id,
            courseName: i.course_name,
            teeDate: i.tee_date,
            teeTime: i.tee_time,
            status: i.status,
            invitee: {
                userId: i.invitee_user_id,
                phone: i.invitee_phone,
                name: i.invitee_name || `${i.invitee_first_name || ''} ${i.invitee_last_name || ''}`.trim()
            },
            smsSent: i.sms_sent,
            createdAt: i.created_at
        }));

        res.json({ success: true, invites: formatted });
    } catch (error) {
        logger.error("Get sent invites error:", error);
        res.status(500).json({ success: false, message: "Failed to get sent invites" });
    }
};

/**
 * Get invite responses
 */
const getInviteResponses = async (req, res) => {
    try {
        const inviteId = req.params.id;
        const responses = await inviteRepository.getInviteResponses(inviteId);

        const formatted = responses.map(r => ({
            id: r.id,
            response: r.response,
            message: r.response_message,
            respondedVia: r.responded_via,
            user: r.user_id ? {
                id: r.user_id,
                firstName: r.first_name,
                lastName: r.last_name
            } : null,
            createdAt: r.created_at
        }));

        res.json({ success: true, responses: formatted });
    } catch (error) {
        logger.error("Get invite responses error:", error);
        res.status(500).json({ success: false, message: "Failed to get responses" });
    }
};

/**
 * Get user's response history
 */
const getUserResponseHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await inviteRepository.getUserResponseHistory(userId);

        const formatted = history.map(h => ({
            id: h.id,
            response: h.response,
            message: h.response_message,
            teeTime: {
                id: h.tee_time_id,
                courseName: h.course_name,
                date: h.tee_date,
                time: h.tee_time
            },
            createdAt: h.created_at
        }));

        res.json({ success: true, history: formatted });
    } catch (error) {
        logger.error("Get response history error:", error);
        res.status(500).json({ success: false, message: "Failed to get history" });
    }
};

/**
 * Get waitlist for tee time
 */
const getWaitlist = async (req, res) => {
    try {
        const teeTimeId = req.params.id;
        const waitlist = await inviteRepository.getWaitlist(teeTimeId);

        const formatted = waitlist.map(w => ({
            id: w.id,
            name: w.invitee_name || `${w.first_name || ''} ${w.last_name || ''}`.trim(),
            avatar: w.avatar_url,
            phone: w.invitee_phone,
            createdAt: w.created_at
        }));

        res.json({ success: true, waitlist: formatted });
    } catch (error) {
        logger.error("Get waitlist error:", error);
        res.status(500).json({ success: false, message: "Failed to get waitlist" });
    }
};

module.exports = {
    getPendingInvites,
    getSentInvites,
    getInviteResponses,
    getUserResponseHistory,
    getWaitlist
};

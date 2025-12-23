/**
 * Invite creation handlers
 */
const inviteRepository = require("../../../repositories/inviteRepository");
const teeTimeRepository = require("../../../repositories/teeTimeRepository");
const rosterRepository = require("../../../repositories/rosterRepository");
const notificationService = require("../../../services/notificationService");
const logger = require("../../../config/logger");
const { sendInviteSms } = require("../smsService");
const { INVITE_TYPES } = require("../constants");

/**
 * Create FCFS invites - all at once, first to accept get spots
 */
const createFCFSInvites = async (req, res, teeTime, invitees) => {
    try {
        const userId = req.user.id;

        const createdInvites = await inviteRepository.createBulkInvites(
            teeTime.id,
            userId,
            invitees.map((inv, idx) => ({ ...inv, position: idx }))
        );

        // Send notifications to all invitees simultaneously
        for (const invite of createdInvites) {
            if (invite.invitee_user_id) {
                // In-app notification for registered users
                await notificationService.notifyTeeTimeInvite(
                    invite.invitee_user_id,
                    {
                        id: teeTime.id,
                        date: teeTime.tee_date,
                        time: teeTime.tee_time,
                        courseName: teeTime.course_name,
                    },
                    {
                        id: userId,
                        firstName: req.user.firstName,
                        lastName: req.user.lastName,
                    }
                );
            } else if (invite.invitee_phone) {
                await sendInviteSms(invite, teeTime, true);
            }
        }

        logger.info(`FCFS invites created for tee time ${teeTime.id}: ${createdInvites.length} invites`);

        res.status(201).json({
            success: true,
            invites: createdInvites,
            message: `${createdInvites.length} invites sent. First ${teeTime.max_players - 1} to accept will get spots!`
        });
    } catch (error) {
        logger.error("Create FCFS invites error:", error);
        res.status(500).json({ success: false, message: "Failed to create FCFS invites" });
    }
};

/**
 * Create Roster invites - sequential with response window
 */
const createRosterInvites = async (req, res, teeTime, invitees, responseWindow = 2) => {
    try {
        const userId = req.user.id;
        const responseWindowMs = (responseWindow || 2) * 60 * 60 * 1000;

        const inviteesWithExpiry = invitees.map((inv, idx) => ({
            ...inv,
            position: inv.order || idx,
            expiresAt: idx === 0 ? new Date(Date.now() + responseWindowMs) : null
        }));

        const createdInvites = await inviteRepository.createBulkInvitesWithExpiry(
            teeTime.id,
            userId,
            inviteesWithExpiry
        );

        // Only send notification to first person in queue
        const firstInvite = createdInvites.find(i => i.position === 0);
        if (firstInvite) {
            if (firstInvite.invitee_user_id) {
                // In-app notification for registered users - include deadline
                await notificationService.notifyTeeTimeInvite(
                    firstInvite.invitee_user_id,
                    {
                        id: teeTime.id,
                        date: teeTime.tee_date,
                        time: teeTime.tee_time,
                        courseName: teeTime.course_name,
                    },
                    {
                        id: userId,
                        firstName: req.user.firstName,
                        lastName: req.user.lastName,
                    },
                    firstInvite.expires_at // Pass the deadline
                );
            } else if (firstInvite.invitee_phone) {
                await sendInviteSms(firstInvite, teeTime, false, responseWindow);
            }
        }

        logger.info(`Roster invites created for tee time ${teeTime.id}: ${createdInvites.length} invites, ${responseWindow}h window`);

        res.status(201).json({
            success: true,
            invites: createdInvites,
            responseWindow,
            message: `Invites queued. Each player has ${responseWindow} hour(s) to respond.`
        });
    } catch (error) {
        logger.error("Create roster invites error:", error);
        res.status(500).json({ success: false, message: "Failed to create roster invites" });
    }
};

/**
 * Create invites from roster entries
 */
const createFromRoster = async (req, res) => {
    try {
        const userId = req.user.id;
        const { teeTimeId, rosterIds, count } = req.body;

        const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
        if (!teeTime || teeTime.creator_id !== userId) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const roster = await rosterRepository.getRoster(userId);
        let toInvite = [];

        if (rosterIds && rosterIds.length > 0) {
            toInvite = roster.filter(r => rosterIds.includes(r.id));
        } else if (count) {
            toInvite = roster.slice(0, count);
        }

        const invitees = toInvite.map(r => ({
            userId: r.contact_user_id,
            phone: r.contact_phone,
            name: r.contact_name || `${r.first_name || ''} ${r.last_name || ''}`.trim()
        }));

        const createdInvites = await inviteRepository.createBulkInvites(teeTimeId, userId, invitees);

        for (const invite of createdInvites) {
            if (invite.invitee_user_id) {
                // In-app notification for registered users
                await notificationService.notifyTeeTimeInvite(
                    invite.invitee_user_id,
                    {
                        id: teeTime.id,
                        date: teeTime.tee_date,
                        time: teeTime.tee_time,
                        courseName: teeTime.course_name,
                    },
                    {
                        id: userId,
                        firstName: req.user.firstName,
                        lastName: req.user.lastName,
                    }
                );
            } else if (invite.invitee_phone) {
                await sendInviteSms(invite, teeTime);
            }
        }

        res.status(201).json({ success: true, invites: createdInvites, count: createdInvites.length });
    } catch (error) {
        logger.error("Create from roster error:", error);
        res.status(500).json({ success: false, message: "Failed to create invites from roster" });
    }
};

module.exports = {
    createFCFSInvites,
    createRosterInvites,
    createFromRoster
};

/**
 * Invite Controller - Modular Implementation
 */
const inviteRepository = require("../../repositories/inviteRepository");
const teeTimeRepository = require("../../repositories/teeTimeRepository");
const notificationService = require("../../services/notificationService");
const logger = require("../../config/logger");
const { supabaseAdmin } = require("../../config/supabase");

const { INVITE_TYPES, INVITE_RESPONSES } = require("./constants");
const { sendInviteSms } = require("./smsService");
const { createFCFSInvites, createRosterInvites, createFromRoster } = require("./handlers/createHandlers");
const { processNextRosterInvite, handleAcceptance, handleDecline, handleMaybe } = require("./handlers/responseHandlers");
const { getInviteById, getPendingInvites, getSentInvites, getInviteResponses, getUserResponseHistory, getWaitlist } = require("./handlers/queryHandlers");

class InviteController {
    constructor() {
        // Bind all methods
        this.createInvites = this.createInvites.bind(this);
        this.createFCFSInvites = createFCFSInvites;
        this.createRosterInvites = createRosterInvites;
        this.createFromRoster = createFromRoster;
        this.getInviteById = getInviteById;
        this.getPendingInvites = getPendingInvites;
        this.getSentInvites = getSentInvites;
        this.respondToInvite = this.respondToInvite.bind(this);
        this.getInviteResponses = getInviteResponses;
        this.getUserResponseHistory = getUserResponseHistory;
        this.cancelInvite = this.cancelInvite.bind(this);
        this.getWaitlist = getWaitlist;
        this.processNextRosterInvite = processNextRosterInvite;
    }

    // POST /api/invites
    async createInvites(req, res) {
        try {
            const userId = req.user.id;
            const { teeTimeId, invitees, inviteType, responseWindow } = req.body;

            logger.info("Creating invites:", { teeTimeId, inviteType, inviteesCount: invitees?.length });

            const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
            if (!teeTime) {
                return res.status(404).json({ success: false, message: "Tee time not found" });
            }
            if (teeTime.creator_id !== userId) {
                return res.status(403).json({ success: false, message: "Only creator can send invites" });
            }

            const type = inviteType || teeTime.invite_type || INVITE_TYPES.ROSTER;

            if (type === INVITE_TYPES.FCFS) {
                return createFCFSInvites(req, res, teeTime, invitees);
            } else if (type === INVITE_TYPES.ROSTER) {
                return createRosterInvites(req, res, teeTime, invitees, responseWindow);
            } else if (type === INVITE_TYPES.OPEN) {
                // Open invites don't need specific invites - tee time is posted to community board
                return res.status(201).json({
                    success: true,
                    message: "Open invite created. Tee time is now visible on the community board.",
                    invites: [],
                });
            }

            // Default: create all invites at once (manual)
            const createdInvites = await inviteRepository.createBulkInvites(teeTimeId, userId, invitees);

            for (const invite of createdInvites) {
                if (invite.invitee_user_id) {
                    await notificationService.notifyTeeTimeInvite(
                        invite.invitee_user_id,
                        {
                            id: teeTime.id,
                            date: teeTime.tee_date,
                            time: teeTime.tee_time,
                            courseName: teeTime.course_name,
                            maxPlayers: teeTime.max_players,
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

            res.status(201).json({ success: true, invites: createdInvites });
        } catch (error) {
            logger.error("Create invites error:", error);
            res.status(500).json({ success: false, message: "Failed to create invites" });
        }
    }

    // PUT /api/invites/:id/respond
    async respondToInvite(req, res) {
        try {
            const userId = req.user.id;
            const inviteId = req.params.id;
            const { response, message: responseMessage } = req.body;

            if (!Object.values(INVITE_RESPONSES).includes(response) && response !== 'maybe') {
                return res.status(400).json({ success: false, message: "Invalid response" });
            }

            const invite = await inviteRepository.getInviteById(inviteId);
            if (!invite || invite.invitee_user_id !== userId) {
                return res.status(404).json({ success: false, message: "Invite not found" });
            }

            // Check if invite has expired
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                await inviteRepository.respondToInvite(inviteId, userId, INVITE_RESPONSES.EXPIRED);
                return res.status(400).json({
                    success: false,
                    message: "This invite has expired. The spot may have been offered to someone else."
                });
            }

            // Create response record
            await inviteRepository.createInviteResponse({
                inviteId,
                userId,
                response,
                responseMessage,
                respondedVia: 'app',
                ipAddress: req.ip,
                deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : null
            });

            const teeTime = await teeTimeRepository.getTeeTimeById(invite.tee_time_id);
            const participantCount = await teeTimeRepository.getParticipantCount(invite.tee_time_id);

            let result;
            if (response === INVITE_RESPONSES.ACCEPTED) {
                result = await handleAcceptance(invite, teeTime, userId, participantCount);
            } else if (response === INVITE_RESPONSES.DECLINED) {
                result = await handleDecline(invite, teeTime, userId);
            } else {
                result = await handleMaybe(invite, userId);
            }

            // Check and update tee time status after response
            await teeTimeRepository.checkAndUpdateStatus(invite.tee_time_id);
            
            // If invite was accepted and tee time is confirmed, ensure participant is added to conversation
            if (response === INVITE_RESPONSES.ACCEPTED && userId) {
                try {
                    const { data: teeTime } = await supabaseAdmin
                        .from("tee_times")
                        .select("status")
                        .eq("id", invite.tee_time_id)
                        .single();
                    
                    if (teeTime && teeTime.status === "confirmed") {
                        const conversationRepository = require("../../repositories/conversationRepository");
                        const conv = await conversationRepository.getOrCreateTeeTimeConversation(userId, invite.tee_time_id);
                        await conversationRepository.ensureParticipant(conv.id, userId);
                        logger.info(`Added participant ${userId} to conversation after accepting invite for confirmed tee time ${invite.tee_time_id}`);
                    }
                } catch (chatError) {
                    // Don't fail invite response if conversation update fails
                    logger.error(`Failed to add participant to conversation after invite acceptance:`, chatError.message);
                }
            }

            return res.json(result);
        } catch (error) {
            logger.error("Respond to invite error:", error);
            res.status(500).json({ success: false, message: "Failed to respond to invite" });
        }
    }

    // DELETE /api/invites/:id
    async cancelInvite(req, res) {
        try {
            const userId = req.user.id;
            const inviteId = req.params.id;

            const cancelled = await inviteRepository.cancelInvite(inviteId, userId);
            if (!cancelled) {
                return res.status(404).json({ success: false, message: "Invite not found or not authorized" });
            }

            res.json({ success: true, message: "Invite cancelled" });
        } catch (error) {
            logger.error("Cancel invite error:", error);
            res.status(500).json({ success: false, message: "Failed to cancel invite" });
        }
    }
}

module.exports = new InviteController();

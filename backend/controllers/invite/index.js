/**
 * Invite Controller - Modular Implementation
 */
const inviteRepository = require("../../repositories/inviteRepository");
const teeTimeRepository = require("../../repositories/teeTimeRepository");
const userRepository = require("../../repositories/userRepository");
const notificationService = require("../../services/notificationService");
const logger = require("../../config/logger");
const { invitesLogger } = require("../../config/logger");
const { supabaseAdmin } = require("../../config/supabase");

const { INVITE_TYPES, INVITE_RESPONSES } = require("./constants");
const { sendInviteSms } = require("./smsService");
const { createFCFSInvites, createRosterInvites, createFromRoster, notifyPhoneInviteeIfAppUser } = require("./handlers/createHandlers");
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
            } else if (type === INVITE_TYPES.MANUAL) {
                // Everyone selected gets an active invite + notification (like FCFS), not roster backups
                const windowHours = responseWindow != null ? Number(responseWindow) : 2;
                const hours = Number.isFinite(windowHours) && windowHours > 0 ? windowHours : 2;
                const deadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
                req.body = { ...req.body, deadline };
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
            invitesLogger.info("[INVITE] Manual invite creation started", {
                event: "invite_create_start",
                teeTimeId,
                inviterId: userId,
                inviteeCount: invitees?.length || 0,
                invitees: invitees?.map(inv => ({
                    hasUserId: !!inv.userId,
                    userId: inv.userId,
                    hasPhone: !!inv.phone,
                    phone: inv.phone,
                    name: inv.name,
                })),
            });

            const createdInvites = await inviteRepository.createBulkInvites(teeTimeId, userId, invitees);

            invitesLogger.info("[INVITE] Manual invites created in database", {
                event: "invites_created",
                teeTimeId,
                inviteCount: createdInvites?.length || 0,
                invites: createdInvites?.map(inv => ({
                    inviteId: inv.id,
                    inviteeUserId: inv.invitee_user_id,
                    inviteePhone: inv.invitee_phone,
                    inviteeName: inv.invitee_name,
                    status: inv.status,
                })),
            });

            logger.info(`Created ${createdInvites.length} invites for tee time ${teeTimeId}`, {
                inviteesWithUserId: createdInvites.filter(i => i.invitee_user_id).length,
                inviteesWithPhone: createdInvites.filter(i => i.invitee_phone).length,
            });

            for (const invite of createdInvites) {
                if (invite.invitee_user_id) {
                    try {
                        invitesLogger.info("[INVITE] Sending notification to registered user", {
                            event: "notification_send_start",
                            inviteId: invite.id,
                            inviteeUserId: invite.invitee_user_id,
                            teeTimeId,
                        });

                        const notification = await notificationService.notifyTeeTimeInvite(
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
                            },
                            null, // expiresAt
                            invite.id // Pass inviteId so frontend can respond
                        );
                        
                        if (notification) {
                            invitesLogger.info("[INVITE] Notification sent successfully", {
                                event: "notification_sent",
                                inviteId: invite.id,
                                inviteeUserId: invite.invitee_user_id,
                                notificationId: notification.id,
                            });
                            logger.info(`Notification sent for invite ${invite.id} to user ${invite.invitee_user_id}`);
                        } else {
                            invitesLogger.warn("[INVITE] Notification creation returned null", {
                                event: "notification_failed",
                                inviteId: invite.id,
                                inviteeUserId: invite.invitee_user_id,
                            });
                            logger.warn(`Failed to create notification for invite ${invite.id}, user ${invite.invitee_user_id}`);
                        }
                    } catch (notifError) {
                        invitesLogger.error("[INVITE] Notification send error", {
                            event: "notification_error",
                            inviteId: invite.id,
                            inviteeUserId: invite.invitee_user_id,
                            error: notifError?.message,
                            stack: notifError?.stack,
                        });
                        logger.error(`Error sending notification for invite ${invite.id}:`, notifError);
                    }
                } else if (invite.invitee_phone) {
                    const sentInApp = await notifyPhoneInviteeIfAppUser(
                        invite,
                        teeTime,
                        { id: userId, firstName: req.user.firstName, lastName: req.user.lastName },
                        null
                    );
                    if (!sentInApp) {
                        invitesLogger.info("[INVITE] Sending SMS to phone invitee", {
                            event: "sms_send_start",
                            inviteId: invite.id,
                            inviteePhone: invite.invitee_phone,
                        });
                        await sendInviteSms(invite, teeTime);
                    }
                } else {
                    invitesLogger.warn("[INVITE] Invite has no userId or phone", {
                        event: "invite_no_contact",
                        inviteId: invite.id,
                        inviteeName: invite.invitee_name,
                    });
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
            const { invitesLogger } = require("../../config/logger");
            const userId = req.user.id;
            const inviteId = req.params.id;
            const { response, message: responseMessage } = req.body;

            invitesLogger.info("[INVITE] Responding to invite", {
                event: "respond_to_invite_start",
                inviteId,
                userId,
                response,
            });

            if (!Object.values(INVITE_RESPONSES).includes(response) && response !== 'maybe') {
                invitesLogger.warn("[INVITE] Invalid response", {
                    event: "respond_to_invite_invalid",
                    inviteId,
                    userId,
                    response,
                });
                return res.status(400).json({ success: false, message: "Invalid response" });
            }

            const invite = await inviteRepository.getInviteById(inviteId);
            if (!invite || invite.invitee_user_id !== userId) {
                invitesLogger.warn("[INVITE] Invite not found or not authorized", {
                    event: "respond_to_invite_not_found",
                    inviteId,
                    userId,
                    inviteExists: !!invite,
                    inviteeUserId: invite?.invitee_user_id,
                });
                return res.status(404).json({ success: false, message: "Invite not found" });
            }

            invitesLogger.info("[INVITE] Invite found", {
                event: "respond_to_invite_found",
                inviteId,
                userId,
                inviteStatus: invite.status,
                expiresAt: invite.expires_at,
            });

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
                invitesLogger.info("[INVITE] Processing acceptance", {
                    event: "respond_to_invite_accept",
                    inviteId,
                    userId,
                });
                result = await handleAcceptance(invite, teeTime, userId, participantCount);
                invitesLogger.info("[INVITE] Acceptance result", {
                    event: "respond_to_invite_accept_result",
                    inviteId,
                    userId,
                    success: result.success,
                    status: result.status,
                });
            } else if (response === INVITE_RESPONSES.DECLINED) {
                invitesLogger.info("[INVITE] Processing decline", {
                    event: "respond_to_invite_decline",
                    inviteId,
                    userId,
                });
                result = await handleDecline(invite, teeTime, userId);
            } else {
                invitesLogger.info("[INVITE] Processing maybe", {
                    event: "respond_to_invite_maybe",
                    inviteId,
                    userId,
                });
                result = await handleMaybe(invite, userId);
            }

            // Notify organizer when someone accepts or declines
            if (result.success && (response === INVITE_RESPONSES.ACCEPTED || response === INVITE_RESPONSES.DECLINED)) {
                try {
                    const responder = await userRepository.findById(userId);
                    if (responder && teeTime.creator_id) {
                        await notificationService.notifyTeeTimeResponse(
                            teeTime.creator_id,
                            { id: userId, firstName: responder.first_name || "", lastName: responder.last_name || "" },
                            teeTime,
                            response === INVITE_RESPONSES.ACCEPTED
                        );
                    }
                } catch (notifErr) {
                    logger.error("Failed to notify organizer of invite response", notifErr);
                }
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
                        await conversationRepository.syncTeeTimeConversationParticipants(invite.tee_time_id);
                        invitesLogger.info("[INVITE] Added participant to conversation", {
                            event: "respond_to_invite_conversation_added",
                            inviteId,
                            userId,
                            teeTimeId: invite.tee_time_id,
                        });
                        logger.info(`Added participant ${userId} to conversation after accepting invite for confirmed tee time ${invite.tee_time_id}`);
                    }
                } catch (chatError) {
                    // Don't fail invite response if conversation update fails
                    invitesLogger.warn("[INVITE] Failed to add participant to conversation", {
                        event: "respond_to_invite_conversation_error",
                        inviteId,
                        userId,
                        error: chatError?.message,
                    });
                    logger.error(`Failed to add participant to conversation after invite acceptance:`, chatError.message);
                }
            }

            // Mark related notifications as responded/deleted
            if (result.success) {
                try {
                    invitesLogger.info("[INVITE] Marking related notifications as responded", {
                        event: "respond_to_invite_mark_notifications",
                        inviteId,
                        userId,
                        response,
                    });
                    
                    // Find and mark all notifications related to this invite
                    // Query for notifications where data.inviteId matches or data.teeTimeId matches
                    const { data: notifications, error: notifError } = await supabaseAdmin
                        .from("notifications")
                        .select("id, data")
                        .eq("user_id", userId);
                    
                    if (!notifError && notifications) {
                        // Filter notifications that match this inviteId or teeTimeId
                        const matchingNotifications = notifications.filter(notif => {
                            const notifData = notif.data || {};
                            const notifInviteId = notifData.inviteId;
                            const notifTeeTimeId = notifData.teeTimeId;
                            return (notifInviteId === inviteId) || 
                                   (notifTeeTimeId === invite.tee_time_id && notifData.type === "tee_time_invite");
                        });
                        
                        // Mark each matching notification as responded and read
                        for (const notif of matchingNotifications) {
                            const updatedData = { ...(notif.data || {}), responded: true };
                            await supabaseAdmin
                                .from("notifications")
                                .update({
                                    data: updatedData,
                                    read_at: new Date().toISOString(),
                                    status: "read"
                                })
                                .eq("id", notif.id)
                                .eq("user_id", userId);
                            
                            invitesLogger.info("[INVITE] Notification marked as responded", {
                                event: "notification_marked_responded",
                                notificationId: notif.id,
                                inviteId,
                                userId,
                            });
                        }
                        
                        invitesLogger.info("[INVITE] Notifications marked as responded", {
                            event: "notifications_marked_responded",
                            inviteId,
                            userId,
                            count: matchingNotifications.length,
                        });
                    } else if (notifError) {
                        invitesLogger.warn("[INVITE] Error fetching notifications for cleanup", {
                            event: "notification_fetch_error",
                            inviteId,
                            userId,
                            error: notifError?.message,
                        });
                    }
                } catch (notifCleanupError) {
                    // Don't fail the invite response if notification cleanup fails
                    invitesLogger.warn("[INVITE] Failed to mark notifications as responded", {
                        event: "notification_cleanup_error",
                        inviteId,
                        userId,
                        error: notifCleanupError?.message,
                    });
                    logger.error("Failed to mark notifications as responded:", notifCleanupError);
                }
            }

            invitesLogger.info("[INVITE] Response completed", {
                event: "respond_to_invite_complete",
                inviteId,
                userId,
                response,
                resultSuccess: result.success,
            });

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

/**
 * Invite response handlers
 */
const inviteRepository = require("../../../repositories/inviteRepository");
const teeTimeRepository = require("../../../repositories/teeTimeRepository");
const userRepository = require("../../../repositories/userRepository");
const socialRateService = require("../../../services/socialRateService");
const notificationService = require("../../../services/notificationService");
const logger = require("../../../config/logger");
const { sendInviteSms } = require("../smsService");
const { INVITE_TYPES, INVITE_RESPONSES } = require("../constants");

/**
 * Process next person in roster queue (backup invites)
 * When someone declines, activate the next backup invite immediately
 */
const processNextRosterInvite = async (teeTimeId, responseWindowHours = 2) => {
    try {
        const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
        if (!teeTime || teeTime.invite_type !== INVITE_TYPES.ROSTER) return;

        const participantCount = await teeTimeRepository.getParticipantCount(teeTimeId);
        const spotsLeft = teeTime.max_players - participantCount;

        if (spotsLeft <= 0) {
            logger.info(`Tee time ${teeTimeId} is full, no more invites needed`);
            return;
        }

        // Get the next backup invite (pending with no expiry_at)
        const nextInvite = await inviteRepository.getNextPendingInvite(teeTimeId);

        if (nextInvite) {
            const responseWindowMs = responseWindowHours * 60 * 60 * 1000;
            const expiresAt = new Date(Date.now() + responseWindowMs);

            // Activate the backup invite by setting expiry
            await inviteRepository.activateInvite(nextInvite.id, expiresAt);

            // Send notification to the backup invitee
            if (nextInvite.invitee_user_id) {
                // Get creator info for notification (getTeeTimeById returns flattened fields)
                // In-app notification for registered users
                await notificationService.notifyTeeTimeInvite(
                    nextInvite.invitee_user_id,
                    {
                        id: teeTime.id,
                        date: teeTime.tee_date,
                        time: teeTime.tee_time,
                        courseName: teeTime.course_name,
                        maxPlayers: teeTime.max_players,
                    },
                    {
                        id: teeTime.creator_id,
                        firstName: teeTime.first_name || '',
                        lastName: teeTime.last_name || '',
                    },
                    expiresAt,
                    nextInvite.id // Pass inviteId so frontend can respond
                );
            } else if (nextInvite.invitee_phone) {
                await sendInviteSms(nextInvite, teeTime, false, responseWindowHours);
            }

            logger.info(`Activated backup roster invite ${nextInvite.id} (position ${nextInvite.position}) for tee time ${teeTimeId}`);
        } else {
            logger.info(`No backup invites available for tee time ${teeTimeId}`);
        }
    } catch (error) {
        logger.error("Process next roster invite error:", error);
    }
};

/**
 * Handle invite acceptance
 */
const handleAcceptance = async (invite, teeTime, userId, participantCount) => {
    const { invitesLogger } = require("../../../config/logger");
    
    invitesLogger.info("[INVITE] handleAcceptance called", {
        event: "handle_acceptance_start",
        inviteId: invite.id,
        userId,
        teeTimeId: teeTime.id,
        participantCount,
        inviteType: teeTime.invite_type,
    });
    
    // Use atomic acceptance to prevent race conditions
    const user = await userRepository.findById(userId);
    const userName = `${user.first_name} ${user.last_name}`;
    
    logger.info(`Processing acceptance for invite ${invite.id}, user ${userId}, teeTime ${teeTime.id}`);
    invitesLogger.info("[INVITE] Calling acceptInviteAtomic", {
        event: "handle_acceptance_calling_atomic",
        inviteId: invite.id,
        userId,
        userName,
        inviteType: teeTime.invite_type,
    });
    
    const result = await inviteRepository.acceptInviteAtomic(
        invite.id,
        userId,
        userName,
        teeTime.invite_type
    );

    logger.info(`Atomic acceptance result:`, result);
    invitesLogger.info("[INVITE] acceptInviteAtomic result", {
        event: "handle_acceptance_atomic_result",
        inviteId: invite.id,
        userId,
        success: result.success,
        reason: result.reason,
        status: result.status,
    });

    if (!result.success) {
        if (result.reason === 'full') {
            return {
                success: true,
                message: "Tee time is full. You've been added to the waitlist.",
                status: 'waitlist'
            };
        } else if (result.reason === 'tie_breaker_lost') {
            return {
                success: true,
                message: "Someone with higher priority accepted at the same time. You've been added to the waitlist.",
                status: 'waitlist'
            };
        } else if (result.reason === 'already_responded') {
            return {
                success: false,
                message: "You've already responded to this invite.",
                status: 'error'
            };
        } else {
            logger.error(`Acceptance failed with reason: ${result.reason}`);
            return {
                success: false,
                message: "Unable to process your response. Please try again.",
                status: 'error'
            };
        }
    }

    // Apply social rate bonus
    await socialRateService.applyAcceptBonus(userId, invite.tee_time_id, invite.id);

    return {
        success: true,
        message: "You're in! See you on the course. (+2 Social Rate)",
        status: INVITE_RESPONSES.ACCEPTED
    };
};

/**
 * Handle invite decline
 */
const handleDecline = async (invite, teeTime, userId) => {
    await inviteRepository.respondToInvite(invite.id, userId, INVITE_RESPONSES.DECLINED);

    const penaltyApplied = await socialRateService.applyLateDeclinePenalty(
        userId,
        invite.tee_time_id,
        invite.id,
        invite.created_at
    );

    // For roster invites: trigger next person in queue
    if (teeTime.invite_type === INVITE_TYPES.ROSTER) {
        const responseWindow = teeTime.response_window || 2;
        await processNextRosterInvite(invite.tee_time_id, responseWindow);
    }

    return {
        success: true,
        message: penaltyApplied
            ? "Response recorded. (-1 Social Rate for late decline)"
            : "Response recorded. Maybe next time!",
        status: INVITE_RESPONSES.DECLINED,
        penaltyApplied: !!penaltyApplied
    };
};

/**
 * Handle maybe response
 */
const handleMaybe = async (invite, userId) => {
    await inviteRepository.respondToInvite(invite.id, userId, INVITE_RESPONSES.MAYBE);
    return {
        success: true,
        message: "Response recorded as maybe.",
        status: INVITE_RESPONSES.MAYBE
    };
};

module.exports = {
    processNextRosterInvite,
    handleAcceptance,
    handleDecline,
    handleMaybe
};

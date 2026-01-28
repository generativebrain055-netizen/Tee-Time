/**
 * Invite response handlers
 */
const inviteRepository = require("../../../repositories/inviteRepository");
const teeTimeRepository = require("../../../repositories/teeTimeRepository");
const userRepository = require("../../../repositories/userRepository");
const socialRateService = require("../../../services/socialRateService");
const logger = require("../../../config/logger");
const { sendInviteSms } = require("../smsService");
const { INVITE_TYPES, INVITE_RESPONSES } = require("../constants");

/**
 * Process next person in roster queue
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

        const nextInvite = await inviteRepository.getNextPendingInvite(teeTimeId);

        if (nextInvite) {
            const responseWindowMs = responseWindowHours * 60 * 60 * 1000;
            const expiresAt = new Date(Date.now() + responseWindowMs);

            await inviteRepository.activateInvite(nextInvite.id, expiresAt);

            if (!nextInvite.invitee_user_id && nextInvite.invitee_phone) {
                await sendInviteSms(nextInvite, teeTime, false, responseWindowHours);
            }

            logger.info(`Activated next roster invite ${nextInvite.id} for tee time ${teeTimeId}`);
        }
    } catch (error) {
        logger.error("Process next roster invite error:", error);
    }
};

/**
 * Handle invite acceptance
 */
const handleAcceptance = async (invite, teeTime, userId, participantCount) => {
    // Use atomic acceptance to prevent race conditions
    const user = await userRepository.findById(userId);
    const userName = `${user.first_name} ${user.last_name}`;
    
    logger.info(`Processing acceptance for invite ${invite.id}, user ${userId}, teeTime ${teeTime.id}`);
    
    const result = await inviteRepository.acceptInviteAtomic(
        invite.id,
        userId,
        userName,
        teeTime.invite_type
    );

    logger.info(`Atomic acceptance result:`, result);

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

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
    if (participantCount < teeTime.max_players) {
        // For FCFS invites: Use tie-breaker logic based on roster position
        if (teeTime.invite_type === INVITE_TYPES.FCFS) {
            const tieBreakerResult = await inviteRepository.acceptFCFSWithTieBreaker(
                invite.id,
                userId,
                invite.position // roster position from invite
            );

            if (!tieBreakerResult.success) {
                if (tieBreakerResult.reason === 'tie_breaker_lost') {
                    // Someone with higher roster priority accepted at the same time
                    await inviteRepository.moveToWaitlist(invite.id);
                    logger.info(`User ${userId} lost FCFS tie-breaker for tee time ${invite.tee_time_id}, moved to waitlist`);
                    return {
                        success: true,
                        message: "Someone with higher roster priority accepted at the same time. You've been added to the waitlist.",
                        status: 'waitlist'
                    };
                } else if (tieBreakerResult.reason === 'full') {
                    await inviteRepository.moveToWaitlist(invite.id);
                    return {
                        success: true,
                        message: "Tee time is full. You've been added to the waitlist.",
                        status: 'waitlist'
                    };
                } else {
                    return {
                        success: false,
                        message: "Unable to process your response. Please try again.",
                        status: 'error'
                    };
                }
            }
        }

        const user = await userRepository.findById(userId);
        await teeTimeRepository.addParticipant(
            invite.tee_time_id,
            userId,
            null,
            `${user.first_name} ${user.last_name}`,
            participantCount
        );

        await inviteRepository.respondToInvite(invite.id, userId, INVITE_RESPONSES.ACCEPTED);
        await socialRateService.applyAcceptBonus(userId, invite.tee_time_id, invite.id);

        // For FCFS: Check if tee time is now full
        if (teeTime.invite_type === INVITE_TYPES.FCFS) {
            const newCount = participantCount + 1;
            if (newCount >= teeTime.max_players) {
                await inviteRepository.moveRemainingToWaitlist(invite.tee_time_id);
                logger.info(`Tee time ${invite.tee_time_id} full via FCFS, remaining moved to waitlist`);
            }
        }

        return {
            success: true,
            message: "You're in! See you on the course. (+2 Social Rate)",
            status: INVITE_RESPONSES.ACCEPTED
        };
    } else {
        await inviteRepository.moveToWaitlist(invite.id);
        return {
            success: true,
            message: "Tee time is full. You've been added to the waitlist.",
            status: 'waitlist'
        };
    }
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

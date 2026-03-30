/**
 * Invite response handlers
 */
const inviteRepository = require("../../../repositories/inviteRepository");
const teeTimeRepository = require("../../../repositories/teeTimeRepository");
const userRepository = require("../../../repositories/userRepository");
const socialRateService = require("../../../services/socialRateService");
const notificationService = require("../../../services/notificationService");
const inviteManagementService = require("../../../services/inviteManagementService");
const { supabaseAdmin } = require("../../../config/supabase");
const logger = require("../../../config/logger");
const { sendInviteSms } = require("../smsService");
const { INVITE_TYPES, INVITE_RESPONSES } = require("../constants");

/**
 * Process next person in roster queue (backup invites)
 * When someone declines, activate the next backup invite immediately
 */
const isSequentialInviteTeeTime = (inviteType) =>
    inviteType === INVITE_TYPES.ROSTER;

async function resolveInviteeUserIdByPhone(phone) {
    if (!phone || typeof phone !== "string") return null;
    const trimmed = phone.trim();
    let user = await userRepository.findByPhoneNumber(trimmed);
    if (user) return user.id;
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10) {
        const withPlus = digits.length === 10 ? `+1${digits}` : `+${digits}`;
        if (withPlus !== trimmed) user = await userRepository.findByPhoneNumber(withPlus);
        if (user) return user.id;
        if (digits.length === 10) user = await userRepository.findByPhoneNumber(digits);
        if (user) return user.id;
    }
    return null;
}

/**
 * Activate next backup invite (roster) when a spot opens.
 * Used by fcfsDeadlineService for expired invite cycling.
 */
const processNextRosterInvite = async (teeTimeId, responseWindowHours = 2) => {
    try {
        const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
        if (!teeTime || !isSequentialInviteTeeTime(teeTime.invite_type)) return;

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

            if (nextInvite.invitee_user_id) {
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
                    nextInvite.id
                );
            } else if (nextInvite.invitee_phone) {
                const resolvedUserId = await resolveInviteeUserIdByPhone(nextInvite.invitee_phone);
                if (resolvedUserId) {
                    await inviteRepository.updateInviteeUserId(nextInvite.id, resolvedUserId);
                    await notificationService.notifyTeeTimeInvite(
                        resolvedUserId,
                        {
                            id: teeTime.id,
                            date: teeTime.tee_date,
                            time: teeTime.tee_time,
                            courseName: teeTime.course_name,
                            maxPlayers: teeTime.max_players,
                        },
                        {
                            id: teeTime.creator_id,
                            firstName: teeTime.first_name || "",
                            lastName: teeTime.last_name || "",
                        },
                        expiresAt,
                        nextInvite.id
                    );
                } else {
                    await sendInviteSms(nextInvite, teeTime, false, responseWindowHours);
                }
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
 * Direct, reliable activation + notification for sequential roster declines.
 *
 * Unlike processNextRosterInvite, this function:
 *   - Receives the already-fetched teeTime so there is no risk of a re-fetch failure
 *     silently killing the flow.
 *   - Queries ALL pending invites in one shot and filters in JS (avoids PostgREST
 *     NULL-comparison edge cases).
 *   - Handles both backup invites (expires_at IS NULL → activate + notify) AND the
 *     fallback where both invitees were initial invites (expires_at already set → re-notify).
 *   - Logs every step so issues are visible in production logs.
 */
const sendDeclineActivationNotifications = async (
    teeTimeId,
    declinedUserId,
    teeTime,
    responseWindowHours
) => {
    const { invitesLogger } = require("../../../config/logger");
    try {
        const participantCount = await teeTimeRepository.getParticipantCount(teeTimeId);
        const spotsLeft = teeTime.max_players - participantCount;

        if (spotsLeft <= 0) {
            logger.info(`[DECLINE] Tee time ${teeTimeId} is full — no further invites needed`);
            return;
        }

        const responseWindowMs = (responseWindowHours || 2) * 60 * 60 * 1000;
        const newExpiresAt = new Date(Date.now() + responseWindowMs);

        const organizer = {
            id: teeTime.creator_id,
            firstName: teeTime.first_name || "",
            lastName: teeTime.last_name || "",
        };

        const teeTimeData = {
            id: teeTime.id,
            date: teeTime.tee_date,
            time: teeTime.tee_time,
            courseName: teeTime.course_name,
            maxPlayers: teeTime.max_players,
        };

        // Fetch all pending invites for this tee time ordered by position
        const { data: allPending, error: fetchError } = await supabaseAdmin
            .from("invites")
            .select("*")
            .eq("tee_time_id", teeTimeId)
            .eq("status", "pending")
            .order("position", { ascending: true });

        if (fetchError) {
            logger.error(`[DECLINE] Failed to fetch pending invites for ${teeTimeId}:`, fetchError?.message);
            return;
        }

        // Filter out the person who just declined (JS filter handles NULL invitee_user_id safely)
        const others = (allPending || []).filter(
            (inv) => inv.invitee_user_id !== declinedUserId
        );

        invitesLogger.info("[DECLINE] Pending invites after filtering decliner", {
            event: "decline_pending_invites",
            teeTimeId,
            declinedUserId,
            totalPending: (allPending || []).length,
            othersCount: others.length,
            others: others.map((inv) => ({
                inviteId: inv.id,
                inviteeUserId: inv.invitee_user_id,
                hasPhone: !!inv.invitee_phone,
                expiresAt: inv.expires_at,
                position: inv.position,
            })),
        });

        const backups = others.filter((inv) => !inv.expires_at);
        const alreadyActive = others.filter((inv) => !!inv.expires_at);

        // --- Step 1: Activate backup invites (not yet notified) and send notifications ---
        let notifiedCount = 0;

        for (const backup of backups) {
            if (notifiedCount >= spotsLeft) break;

            const { error: activateError } = await supabaseAdmin
                .from("invites")
                .update({ expires_at: newExpiresAt })
                .eq("id", backup.id);

            if (activateError) {
                logger.error(`[DECLINE] Failed to activate invite ${backup.id}:`, activateError?.message);
                continue;
            }

            let targetUserId = backup.invitee_user_id;

            // Resolve phone → registered user if needed
            if (!targetUserId && backup.invitee_phone) {
                targetUserId = await resolveInviteeUserIdByPhone(backup.invitee_phone);
                if (targetUserId) {
                    await inviteRepository.updateInviteeUserId(backup.id, targetUserId);
                    invitesLogger.info("[DECLINE] Resolved phone to userId for backup", {
                        inviteId: backup.id,
                        targetUserId,
                    });
                }
            }

            if (targetUserId) {
                await notificationService.notifyTeeTimeInvite(
                    targetUserId,
                    teeTimeData,
                    organizer,
                    newExpiresAt,
                    backup.id
                );
                invitesLogger.info("[DECLINE] Sent invite notification to backup invitee", {
                    event: "decline_backup_notified",
                    inviteId: backup.id,
                    targetUserId,
                    teeTimeId,
                    position: backup.position,
                });
            } else if (backup.invitee_phone) {
                await sendInviteSms(backup, teeTime, false, responseWindowHours);
                invitesLogger.info("[DECLINE] Sent SMS to backup invitee (no app account)", {
                    event: "decline_backup_sms",
                    inviteId: backup.id,
                    teeTimeId,
                });
            }

            notifiedCount++;
        }

        // --- Step 2: If there were no backups, re-notify already-active pending invitees ---
        // This covers the case where all invitees were initial (max_players - 1 >= invitees.length).
        if (backups.length === 0 && alreadyActive.length > 0) {
            for (const active of alreadyActive) {
                if (!active.invitee_user_id) continue;
                await notificationService.notifyTeeTimeInvite(
                    active.invitee_user_id,
                    teeTimeData,
                    organizer,
                    active.expires_at,
                    active.id
                );
                invitesLogger.info("[DECLINE] Re-sent notification to already-active invitee", {
                    event: "decline_renotify_active",
                    inviteId: active.id,
                    targetUserId: active.invitee_user_id,
                    teeTimeId,
                });
            }
            notifiedCount += alreadyActive.filter((a) => !!a.invitee_user_id).length;
        }

        if (notifiedCount === 0) {
            logger.info(`[DECLINE] No other pending invitees to notify for tee time ${teeTimeId}`);
        }
    } catch (err) {
        logger.error("[DECLINE] sendDeclineActivationNotifications error:", err?.message || err);
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
        }

        const rpcMsg = String(result.message || '').toLowerCase();
        const rpcSaysFull =
            rpcMsg.includes('tee time is full') ||
            rpcMsg === 'tee time is full' ||
            rpcMsg.includes('tee time full');

        if (rpcSaysFull) {
            invitesLogger.info("[INVITE] Accept blocked — tee time already at capacity (RPC)", {
                event: "handle_acceptance_tee_full",
                inviteId: invite.id,
                userId,
            });
            return {
                success: false,
                message:
                    'This tee time is already full. All spots have been taken.',
                code: 'TEE_TIME_FULL',
                status: 'tee_time_full',
            };
        }

        logger.error(`Acceptance failed with reason: ${result.reason}, message: ${result.message}`);
        return {
            success: false,
            message: result.message || 'Unable to process your response. Please try again.',
            status: 'error'
        };
    }

    // Apply social rate bonus (+2)
    const newSocialRate = await socialRateService.applyAcceptBonus(userId, invite.tee_time_id, invite.id);

    return {
        success: true,
        message: "You're in! See you on the course. (+2 Social Rate)",
        status: INVITE_RESPONSES.ACCEPTED,
        socialRateDelta: 2,
        newSocialRate: newSocialRate ?? undefined
    };
};

/**
 * Handle invite decline
 */
const handleDecline = async (invite, teeTime, userId) => {
    await inviteRepository.respondToInvite(invite.id, userId, INVITE_RESPONSES.DECLINED);

    const newSocialRate = await socialRateService.applyLateDeclinePenalty(
        userId,
        invite.tee_time_id,
        invite.id,
        invite.created_at
    );
    const penaltyApplied = newSocialRate != null;

    // Roster: activate the next invitee in the queue and send them a notification.
    // Uses sendDeclineActivationNotifications (direct, reliable) instead of the
    // re-fetching processNextRosterInvite to avoid silent failures.
    if (isSequentialInviteTeeTime(teeTime.invite_type)) {
        const responseWindow = teeTime.response_window || 2;
        await sendDeclineActivationNotifications(invite.tee_time_id, userId, teeTime, responseWindow);
    }

    // FCFS / open / manual (parallel): re-notify other pending invitees after a decline
    if (
        teeTime.invite_type === INVITE_TYPES.FCFS ||
        teeTime.invite_type === INVITE_TYPES.OPEN ||
        teeTime.invite_type === INVITE_TYPES.MANUAL
    ) {
        await inviteManagementService.notifyOtherPendingInviteesAfterDecline(
            invite.tee_time_id,
            userId,
        );
    }

    return {
        success: true,
        message: penaltyApplied
            ? "Response recorded. (-1 Social Rate for declining more than 24 hours after the invite)"
            : "Response recorded. Maybe next time!",
        status: INVITE_RESPONSES.DECLINED,
        penaltyApplied: !!penaltyApplied,
        socialRateDelta: penaltyApplied ? -1 : 0,
        newSocialRate: newSocialRate ?? undefined
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
    isSequentialInviteTeeTime,
    handleAcceptance,
    handleDecline,
    handleMaybe
};

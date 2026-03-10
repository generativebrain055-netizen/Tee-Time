/**
 * SMS service for invite notifications.
 * Uses shared twilioService (Firestore then env for credentials).
 */
const logger = require("../../config/logger");
const { twilioLogger } = require("../../config/logger");
const inviteRepository = require("../../repositories/inviteRepository");
const twilioService = require("../../services/twilioService");
const { formatDateLocal } = require("../../utils/dateUtils");

/**
 * Format tee time date for SMS display
 * Uses UTC to avoid timezone shift issues with PostgreSQL DATE type
 */
const formatTeeTimeDate = (teeDate) => {
    if (!teeDate) return '';
    const dateStr = typeof teeDate === 'string' ? teeDate : formatDateLocal(teeDate);
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        timeZone: 'UTC'
    });
};

/**
 * Build SMS message based on invite type
 */
const buildSmsMessage = (invite, teeTime, isFCFS, responseWindowHours, deadline = null) => {
    const dateStr = formatTeeTimeDate(teeTime.tee_date);

    if (isFCFS) {
        let message = `FIRST COME FIRST SERVE!\n\n` +
            `Location: ${teeTime.course_name}\n` +
            `Date: ${dateStr} at ${teeTime.tee_time}\n\n` +
            `First to accept get the spots!`;

        if (deadline) {
            const deadlineDate = new Date(deadline);
            const deadlineStr = deadlineDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            message += `\n\nDeadline: ${deadlineStr}`;
        }

        message += `\n\nTap to respond: https://teetime.app/invite/${invite.id}`;
        return message;
    }

    if (responseWindowHours) {
        return `You're invited to play golf!\n\n` +
            `Location: ${teeTime.course_name}\n` +
            `Date: ${dateStr} at ${teeTime.tee_time}\n\n` +
            `You have ${responseWindowHours} hour(s) to respond\n` +
            `Tap to respond: https://teetime.app/invite/${invite.id}`;
    }

    return `You're invited to play golf!\n\n` +
        `Location: ${teeTime.course_name}\n` +
        `Date: ${dateStr} at ${teeTime.tee_time}\n\n` +
        `Download TeeTime Social to respond: https://teetime.app/invite/${invite.id}`;
};

/**
 * Send SMS invite via shared Twilio service (credentials from Firestore or .env).
 */
const sendInviteSms = async (invite, teeTime, isFCFS = false, responseWindowHours = null, deadline = null) => {
    try {
        const configured = await twilioService.isConfiguredAsync();
        if (!configured) {
            logger.warn(`SMS not sent to ${invite.invitee_phone} - Twilio not configured`);
            twilioLogger.warn("[TWILIO] Invite SMS skipped - Twilio not configured", {
                feature: "invite",
                to: invite.invitee_phone,
                inviteId: invite.id,
                inviteLink: `https://teetime.app/invite/${invite.id}`,
            });
            return false;
        }

        const message = buildSmsMessage(invite, teeTime, isFCFS, responseWindowHours, deadline);
        await twilioService.sendSMS(invite.invitee_phone, message);

        await inviteRepository.markSmsSent(invite.id);
        logger.info(`SMS invite sent to ${invite.invitee_phone}`);
        const inviteLink = `https://teetime.app/invite/${invite.id}`;
        twilioLogger.info("[TWILIO] Invite SMS sent", {
            feature: "invite",
            to: invite.invitee_phone,
            inviteId: invite.id,
            inviteLink,
        });
        return true;
    } catch (error) {
        logger.error(`Failed to send SMS invite to ${invite.invitee_phone}:`, error);
        const inviteLink = `https://teetime.app/invite/${invite.id}`;
        twilioLogger.warn("[TWILIO] Invite SMS failed", {
            feature: "invite",
            to: invite.invitee_phone,
            inviteId: invite.id,
            inviteLink,
            error: error?.message,
        });
        return false;
    }
};

module.exports = {
    sendInviteSms,
};

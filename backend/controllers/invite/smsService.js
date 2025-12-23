/**
 * SMS service for invite notifications
 */
const twilio = require("twilio");
const logger = require("../../config/logger");
const inviteRepository = require("../../repositories/inviteRepository");

let twilioClient = null;

// Initialize Twilio client with proper credentials
const initTwilioClient = () => {
    if (twilioClient) return twilioClient;

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_SID && process.env.TWILIO_SECRET) {
        twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_SECRET, {
            accountSid: process.env.TWILIO_ACCOUNT_SID
        });
        logger.info("Twilio client initialized with API Key credentials");
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        logger.info("Twilio client initialized with Auth Token");
    } else {
        logger.warn("Twilio credentials not configured - SMS features will be disabled");
    }

    return twilioClient;
};

// Initialize on module load
initTwilioClient();

/**
 * Format tee time date for SMS
 */
const formatTeeTimeDate = (teeDate) => {
    return new Date(teeDate).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
    });
};

/**
 * Build SMS message based on invite type
 */
const buildSmsMessage = (invite, teeTime, isFCFS, responseWindowHours) => {
    const dateStr = formatTeeTimeDate(teeTime.tee_date);

    if (isFCFS) {
        return `🏌️ FIRST COME FIRST SERVE!\n\n` +
            `📍 ${teeTime.course_name}\n` +
            `📅 ${dateStr} at ${teeTime.tee_time}\n\n` +
            `⚡ First to accept get the spots!\n` +
            `Tap to respond: https://teetime.app/invite/${invite.id}`;
    }

    if (responseWindowHours) {
        return `🏌️ You're invited to play golf!\n\n` +
            `📍 ${teeTime.course_name}\n` +
            `📅 ${dateStr} at ${teeTime.tee_time}\n\n` +
            `⏰ You have ${responseWindowHours} hour(s) to respond\n` +
            `Tap to respond: https://teetime.app/invite/${invite.id}`;
    }

    return `🏌️ You're invited to play golf!\n\n` +
        `📍 ${teeTime.course_name}\n` +
        `📅 ${dateStr} at ${teeTime.tee_time}\n\n` +
        `Download TeeTime Social to respond: https://teetime.app/invite/${invite.id}`;
};

/**
 * Send SMS invite
 */
const sendInviteSms = async (invite, teeTime, isFCFS = false, responseWindowHours = null) => {
    try {
        if (!twilioClient) {
            logger.warn(`SMS not sent to ${invite.invitee_phone} - Twilio not configured`);
            return false;
        }

        const message = buildSmsMessage(invite, teeTime, isFCFS, responseWindowHours);
        const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;

        await twilioClient.messages.create({
            body: message,
            from: fromNumber,
            to: invite.invitee_phone
        });

        await inviteRepository.markSmsSent(invite.id);
        logger.info(`SMS invite sent to ${invite.invitee_phone}`);
        return true;
    } catch (error) {
        logger.error(`Failed to send SMS invite to ${invite.invitee_phone}:`, error);
        return false;
    }
};

module.exports = {
    sendInviteSms,
    initTwilioClient
};

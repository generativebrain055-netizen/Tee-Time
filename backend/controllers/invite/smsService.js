/**
 * SMS service for invite notifications
 */
const twilio = require("twilio");
const logger = require("../../config/logger");
const { twilioLogger } = require("../../config/logger");
const inviteRepository = require("../../repositories/inviteRepository");
const { formatDateLocal } = require("../../utils/dateUtils");

let twilioClient = null;

// Initialize Twilio client with proper credentials
const initTwilioClient = () => {
    if (twilioClient) return twilioClient;

    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const apiKeySid = process.env.TWILIO_API_KEY_SID;
        const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

        // Try API Key authentication first
        if (accountSid && apiKeySid && apiKeySecret) {
            if (!accountSid.startsWith('AC')) {
                logger.warn("TWILIO_ACCOUNT_SID must start with AC. SMS features will be disabled.");
                return null;
            }
            twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
            logger.info("Twilio SMS client initialized with API Key credentials");
        } 
        // Fallback to Auth Token authentication
        else if (accountSid && authToken) {
            if (!accountSid.startsWith('AC')) {
                logger.warn("TWILIO_ACCOUNT_SID appears to be an API Key (SK). SMS features will be disabled. Please provide the actual Account SID (starts with AC).");
                return null;
            }
            twilioClient = twilio(accountSid, authToken);
            logger.info("Twilio SMS client initialized with Auth Token");
        } 
        else {
            logger.warn("Twilio credentials not configured - SMS features will be disabled");
        }
    } catch (error) {
        logger.error("Failed to initialize Twilio SMS client:", error.message);
        twilioClient = null;
    }

    return twilioClient;
};

// Initialize on module load
initTwilioClient();

/**
 * Format tee time date for SMS display
 * Uses UTC to avoid timezone shift issues with PostgreSQL DATE type
 */
const formatTeeTimeDate = (teeDate) => {
    if (!teeDate) return '';
    // If it's already a string in YYYY-MM-DD format, parse it correctly
    const dateStr = typeof teeDate === 'string' ? teeDate : formatDateLocal(teeDate);
    // Parse as UTC to avoid timezone shift
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        timeZone: 'UTC' // Use UTC to prevent shift
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
        
        // Add deadline information if provided
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
 * Send SMS invite
 */
const sendInviteSms = async (invite, teeTime, isFCFS = false, responseWindowHours = null, deadline = null) => {
    try {
        if (!twilioClient) {
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
        const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;

        await twilioClient.messages.create({
            body: message,
            from: fromNumber,
            to: invite.invitee_phone
        });

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
    initTwilioClient
};

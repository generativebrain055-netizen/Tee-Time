const inviteRepository = require("../repositories/inviteRepository");
const teeTimeRepository = require("../repositories/teeTimeRepository");
const rosterRepository = require("../repositories/rosterRepository");
const userRepository = require("../repositories/userRepository");
const logger = require("../config/logger");

// Constants for invite types
const INVITE_TYPES = {
  ROSTER: 'roster',
  FCFS: 'fcfs',
  OPEN: 'open'
};

// Twilio setup - use API Key credentials if AUTH_TOKEN is not set
const twilio = require("twilio");
let twilioClient = null;

// Initialize Twilio client with proper credentials
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_SID && process.env.TWILIO_SECRET) {
  // Use API Key authentication
  twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_SECRET, {
    accountSid: process.env.TWILIO_ACCOUNT_SID
  });
  logger.info("Twilio client initialized with API Key credentials");
} else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  // Use Account SID + Auth Token
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  logger.info("Twilio client initialized with Auth Token");
} else {
  logger.warn("Twilio credentials not configured - SMS features will be disabled");
}

class InviteController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.createInvites = this.createInvites.bind(this);
    this.createFCFSInvites = this.createFCFSInvites.bind(this);
    this.createRosterInvites = this.createRosterInvites.bind(this);
    this.createFromRoster = this.createFromRoster.bind(this);
    this.getPendingInvites = this.getPendingInvites.bind(this);
    this.getSentInvites = this.getSentInvites.bind(this);
    this.respondToInvite = this.respondToInvite.bind(this);
    this.getInviteResponses = this.getInviteResponses.bind(this);
    this.getUserResponseHistory = this.getUserResponseHistory.bind(this);
    this.cancelInvite = this.cancelInvite.bind(this);
    this.sendInviteSms = this.sendInviteSms.bind(this);
    this.getWaitlist = this.getWaitlist.bind(this);
    this.processNextRosterInvite = this.processNextRosterInvite.bind(this);
  }
  // POST /api/invites
  async createInvites(req, res) {
    try {
      const userId = req.user.id;
      const { teeTimeId, invitees, inviteType, responseWindow } = req.body;

      logger.info("Creating invites:", { teeTimeId, inviteType, inviteesCount: invitees?.length });

      // Verify tee time exists and user is creator
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime) {
        logger.error("Tee time not found:", teeTimeId);
        return res.status(404).json({ success: false, message: "Tee time not found" });
      }
      if (teeTime.creator_id !== userId) {
        logger.error("User is not creator:", { userId, creatorId: teeTime.creator_id });
        return res.status(403).json({ success: false, message: "Only creator can send invites" });
      }

      // Route to appropriate handler based on invite type
      const type = inviteType || teeTime.invite_type || INVITE_TYPES.ROSTER;
      logger.info("Invite type determined:", type);
      
      if (type === INVITE_TYPES.FCFS) {
        return this.createFCFSInvites(req, res, teeTime, invitees);
      } else if (type === INVITE_TYPES.ROSTER) {
        return this.createRosterInvites(req, res, teeTime, invitees, responseWindow);
      }

      // Default: create all invites at once (manual/open)
      logger.info("Creating bulk invites for manual/open type:", { invitees });
      const createdInvites = await inviteRepository.createBulkInvites(teeTimeId, userId, invitees);
      logger.info("Invites created:", createdInvites.length);

      // Send SMS to non-app users
      const smsInvites = createdInvites.filter(i => !i.invitee_user_id && i.invitee_phone);
      for (const invite of smsInvites) {
        await this.sendInviteSms(invite, teeTime);
      }

      res.status(201).json({ success: true, invites: createdInvites });
    } catch (error) {
      logger.error("Create invites error:", error);
      res.status(500).json({ success: false, message: "Failed to create invites" });
    }
  }

  // FCFS: Send invites to all at once, first to accept get spots
  async createFCFSInvites(req, res, teeTime, invitees) {
    try {
      const userId = req.user.id;
      
      // Create all invites at once - no position ordering matters for FCFS
      const createdInvites = await inviteRepository.createBulkInvites(
        teeTime.id, 
        userId, 
        invitees.map((inv, idx) => ({
          ...inv,
          position: idx // Position is just for display, not priority
        }))
      );

      // Send notifications to all invitees simultaneously
      for (const invite of createdInvites) {
        if (!invite.invitee_user_id && invite.invitee_phone) {
          await this.sendInviteSms(invite, teeTime, true); // true = FCFS message
        }
        // TODO: Send push notification to app users
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
  }

  // Roster: Sequential invites with response window
  async createRosterInvites(req, res, teeTime, invitees, responseWindow = 2) {
    try {
      const userId = req.user.id;
      const responseWindowMs = (responseWindow || 2) * 60 * 60 * 1000; // Convert hours to ms
      
      // Create all invites with positions and expiry times
      const inviteesWithExpiry = invitees.map((inv, idx) => ({
        ...inv,
        position: inv.order || idx,
        // Only first invite is active, others wait
        expiresAt: idx === 0 
          ? new Date(Date.now() + responseWindowMs)
          : null // Will be set when their turn comes
      }));

      const createdInvites = await inviteRepository.createBulkInvitesWithExpiry(
        teeTime.id, 
        userId, 
        inviteesWithExpiry
      );

      // Only send notification to first person in queue
      const firstInvite = createdInvites.find(i => i.position === 0);
      if (firstInvite) {
        if (!firstInvite.invitee_user_id && firstInvite.invitee_phone) {
          await this.sendInviteSms(firstInvite, teeTime, false, responseWindow);
        }
        // TODO: Send push notification to app user
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
  }

  // Process next person in roster queue (called when someone declines or expires)
  async processNextRosterInvite(teeTimeId, responseWindowHours = 2) {
    try {
      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime || teeTime.invite_type !== INVITE_TYPES.ROSTER) return;

      // Get current participant count
      const participantCount = await teeTimeRepository.getParticipantCount(teeTimeId);
      const spotsLeft = teeTime.max_players - participantCount;
      
      if (spotsLeft <= 0) {
        logger.info(`Tee time ${teeTimeId} is full, no more invites needed`);
        return;
      }

      // Find next pending invite without expiry (waiting in queue)
      const nextInvite = await inviteRepository.getNextPendingInvite(teeTimeId);
      
      if (nextInvite) {
        const responseWindowMs = responseWindowHours * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + responseWindowMs);
        
        // Activate this invite
        await inviteRepository.activateInvite(nextInvite.id, expiresAt);
        
        // Send notification
        if (!nextInvite.invitee_user_id && nextInvite.invitee_phone) {
          await this.sendInviteSms(nextInvite, teeTime, false, responseWindowHours);
        }
        
        logger.info(`Activated next roster invite ${nextInvite.id} for tee time ${teeTimeId}`);
      }
    } catch (error) {
      logger.error("Process next roster invite error:", error);
    }
  }

  // POST /api/invites/from-roster
  async createFromRoster(req, res) {
    try {
      const userId = req.user.id;
      const { teeTimeId, rosterIds, count } = req.body;

      const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
      if (!teeTime || teeTime.creator_id !== userId) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // Get roster entries
      const roster = await rosterRepository.getRoster(userId);
      let toInvite = [];

      if (rosterIds && rosterIds.length > 0) {
        // Specific roster entries
        toInvite = roster.filter(r => rosterIds.includes(r.id));
      } else if (count) {
        // Top N from roster
        toInvite = roster.slice(0, count);
      }

      // Convert to invitee format
      const invitees = toInvite.map(r => ({
        userId: r.contact_user_id,
        phone: r.contact_phone,
        name: r.contact_name || `${r.first_name || ''} ${r.last_name || ''}`.trim()
      }));

      const createdInvites = await inviteRepository.createBulkInvites(teeTimeId, userId, invitees);

      // Send SMS to non-app users
      for (const invite of createdInvites) {
        if (!invite.invitee_user_id && invite.invitee_phone) {
          await this.sendInviteSms(invite, teeTime);
        }
      }

      res.status(201).json({ success: true, invites: createdInvites, count: createdInvites.length });
    } catch (error) {
      logger.error("Create from roster error:", error);
      res.status(500).json({ success: false, message: "Failed to create invites from roster" });
    }
  }

  // GET /api/invites/pending
  async getPendingInvites(req, res) {
    try {
      const userId = req.user.id;
      const invites = await inviteRepository.getPendingInvites(userId);

      const formatted = invites.map(i => ({
        id: i.id,
        teeTimeId: i.tee_time_id,
        courseName: i.course_name,
        courseLocation: i.course_location,
        teeDate: i.tee_date,
        teeTime: i.tee_time,
        inviteType: i.invite_type,
        maxPlayers: i.max_players,
        inviter: {
          firstName: i.inviter_first_name,
          lastName: i.inviter_last_name,
          avatar: i.inviter_avatar
        },
        createdAt: i.created_at
      }));

      res.json({ success: true, invites: formatted });
    } catch (error) {
      logger.error("Get pending invites error:", error);
      res.status(500).json({ success: false, message: "Failed to get pending invites" });
    }
  }

  // GET /api/invites/sent
  async getSentInvites(req, res) {
    try {
      const userId = req.user.id;
      const invites = await inviteRepository.getSentInvites(userId);

      const formatted = invites.map(i => ({
        id: i.id,
        teeTimeId: i.tee_time_id,
        courseName: i.course_name,
        teeDate: i.tee_date,
        teeTime: i.tee_time,
        status: i.status,
        invitee: {
          userId: i.invitee_user_id,
          phone: i.invitee_phone,
          name: i.invitee_name || `${i.invitee_first_name || ''} ${i.invitee_last_name || ''}`.trim()
        },
        smsSent: i.sms_sent,
        createdAt: i.created_at
      }));

      res.json({ success: true, invites: formatted });
    } catch (error) {
      logger.error("Get sent invites error:", error);
      res.status(500).json({ success: false, message: "Failed to get sent invites" });
    }
  }

  // PUT /api/invites/:id/respond
  async respondToInvite(req, res) {
    try {
      const userId = req.user.id;
      const inviteId = req.params.id;
      const { response, message: responseMessage } = req.body; // 'accepted', 'declined', or 'maybe'

      if (!['accepted', 'declined', 'maybe'].includes(response)) {
        return res.status(400).json({ success: false, message: "Invalid response" });
      }

      const invite = await inviteRepository.getInviteById(inviteId);
      if (!invite || invite.invitee_user_id !== userId) {
        return res.status(404).json({ success: false, message: "Invite not found" });
      }

      // Check if invite has expired (for roster invites)
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        await inviteRepository.respondToInvite(inviteId, userId, 'expired');
        return res.status(400).json({ 
          success: false, 
          message: "This invite has expired. The spot may have been offered to someone else." 
        });
      }

      // Create response record in invite_responses table
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

      // Handle acceptance
      if (response === 'accepted') {
        // Check if spots available
        if (participantCount < teeTime.max_players) {
          // Add as participant
          const user = await userRepository.findById(userId);
          await teeTimeRepository.addParticipant(
            invite.tee_time_id,
            userId,
            null,
            `${user.first_name} ${user.last_name}`,
            participantCount
          );
          
          // Update invite status
          await inviteRepository.respondToInvite(inviteId, userId, 'accepted');
          
          // For FCFS: Check if tee time is now full, move remaining to waitlist
          if (teeTime.invite_type === INVITE_TYPES.FCFS) {
            const newCount = participantCount + 1;
            if (newCount >= teeTime.max_players) {
              await inviteRepository.moveRemainingToWaitlist(invite.tee_time_id);
              logger.info(`Tee time ${invite.tee_time_id} full via FCFS, remaining moved to waitlist`);
            }
          }
          
          return res.json({ 
            success: true, 
            message: "You're in! See you on the course.",
            status: 'accepted'
          });
        } else {
          // Tee time is full - add to waitlist
          await inviteRepository.moveToWaitlist(inviteId);
          return res.json({ 
            success: true, 
            message: "Tee time is full. You've been added to the waitlist.",
            status: 'waitlist'
          });
        }
      }

      // Handle decline
      if (response === 'declined') {
        await inviteRepository.respondToInvite(inviteId, userId, 'declined');
        
        // For roster invites: trigger next person in queue
        if (teeTime.invite_type === INVITE_TYPES.ROSTER) {
          // Get response window from tee time notes or default to 2 hours
          const responseWindow = teeTime.response_window || 2;
          await this.processNextRosterInvite(invite.tee_time_id, responseWindow);
        }
        
        return res.json({ 
          success: true, 
          message: "Response recorded. Maybe next time!",
          status: 'declined'
        });
      }

      // Handle maybe
      await inviteRepository.respondToInvite(inviteId, userId, 'maybe');
      return res.json({ 
        success: true, 
        message: "Response recorded as maybe.",
        status: 'maybe'
      });

    } catch (error) {
      logger.error("Respond to invite error:", error);
      res.status(500).json({ success: false, message: "Failed to respond to invite" });
    }
  }

  // GET /api/invites/:id/responses - Get response history for an invite
  async getInviteResponses(req, res) {
    try {
      const inviteId = req.params.id;
      const responses = await inviteRepository.getInviteResponses(inviteId);

      const formatted = responses.map(r => ({
        id: r.id,
        response: r.response,
        message: r.response_message,
        respondedVia: r.responded_via,
        user: r.user_id ? {
          id: r.user_id,
          firstName: r.first_name,
          lastName: r.last_name
        } : null,
        createdAt: r.created_at
      }));

      res.json({ success: true, responses: formatted });
    } catch (error) {
      logger.error("Get invite responses error:", error);
      res.status(500).json({ success: false, message: "Failed to get responses" });
    }
  }

  // GET /api/invites/history - Get user's response history
  async getUserResponseHistory(req, res) {
    try {
      const userId = req.user.id;
      const history = await inviteRepository.getUserResponseHistory(userId);

      const formatted = history.map(h => ({
        id: h.id,
        response: h.response,
        message: h.response_message,
        teeTime: {
          id: h.tee_time_id,
          courseName: h.course_name,
          date: h.tee_date,
          time: h.tee_time
        },
        createdAt: h.created_at
      }));

      res.json({ success: true, history: formatted });
    } catch (error) {
      logger.error("Get response history error:", error);
      res.status(500).json({ success: false, message: "Failed to get history" });
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

  // Helper: Send SMS invite
  async sendInviteSms(invite, teeTime, isFCFS = false, responseWindowHours = null) {
    try {
      // Skip if Twilio is not configured
      if (!twilioClient) {
        logger.warn(`SMS not sent to ${invite.invitee_phone} - Twilio not configured`);
        return;
      }

      const dateStr = new Date(teeTime.tee_date).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      
      let message;
      if (isFCFS) {
        message = `🏌️ FIRST COME FIRST SERVE!\n\n` +
          `📍 ${teeTime.course_name}\n` +
          `📅 ${dateStr} at ${teeTime.tee_time}\n\n` +
          `⚡ First to accept get the spots!\n` +
          `Tap to respond: https://teetime.app/invite/${invite.id}`;
      } else if (responseWindowHours) {
        message = `🏌️ You're invited to play golf!\n\n` +
          `📍 ${teeTime.course_name}\n` +
          `📅 ${dateStr} at ${teeTime.tee_time}\n\n` +
          `⏰ You have ${responseWindowHours} hour(s) to respond\n` +
          `Tap to respond: https://teetime.app/invite/${invite.id}`;
      } else {
        message = `🏌️ You're invited to play golf!\n\n` +
          `📍 ${teeTime.course_name}\n` +
          `📅 ${dateStr} at ${teeTime.tee_time}\n\n` +
          `Download TeeTime Social to respond: https://teetime.app/invite/${invite.id}`;
      }

      const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
      
      await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: invite.invitee_phone
      });

      await inviteRepository.markSmsSent(invite.id);
      logger.info(`SMS invite sent to ${invite.invitee_phone}`);
    } catch (error) {
      logger.error(`Failed to send SMS invite to ${invite.invitee_phone}:`, error);
    }
  }

  // GET /api/invites/:id/waitlist
  async getWaitlist(req, res) {
    try {
      const teeTimeId = req.params.id;
      const waitlist = await inviteRepository.getWaitlist(teeTimeId);

      const formatted = waitlist.map(w => ({
        id: w.id,
        name: w.invitee_name || `${w.first_name || ''} ${w.last_name || ''}`.trim(),
        avatar: w.avatar_url,
        phone: w.invitee_phone,
        createdAt: w.created_at
      }));

      res.json({ success: true, waitlist: formatted });
    } catch (error) {
      logger.error("Get waitlist error:", error);
      res.status(500).json({ success: false, message: "Failed to get waitlist" });
    }
  }
}

module.exports = new InviteController();

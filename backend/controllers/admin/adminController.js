const { generateAdminToken } = require("../../utils/crypto");
const userRepository = require("../../repositories/userRepository");
const userReportRepository = require("../../repositories/userReportRepository");
const deviceRepository = require("../../repositories/deviceRepository");
const notificationService = require("../../services/notificationService");
const { supabaseAdmin } = require("../../config/supabase");
const logger = require("../../config/logger");

const BROADCAST_CHUNK_SIZE = 100; // Expo recommends ≤100 messages per request

/**
 * Super admin login.
 * Credentials are from env: SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD.
 * Only authorized personnel (with these credentials) can access the admin portal.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "";
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "";

    if (!adminEmail || !adminPassword) {
      logger.warn("Super admin login attempted but SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not configured");
      return res.status(503).json({
        success: false,
        message: "Admin portal is not configured.",
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const adminEmailTrimmed = adminEmail.trim().toLowerCase();

    if (emailTrimmed !== adminEmailTrimmed || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = generateAdminToken({ sub: "super_admin" }, "8h");
    return res.json({
      success: true,
      message: "Login successful.",
      accessToken: token,
      expiresIn: "8h",
    });
  } catch (error) {
    logger.error("Admin login error:", error);
    next(error);
  }
};

/**
 * Dashboard stats: total users, active users, tee times booked.
 * Used to monitor platform health.
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [userStats, teeTimeCountResult] = await Promise.all([
      userRepository.getStatistics(),
      supabaseAdmin.from("tee_times").select("*", { count: "exact", head: true }),
    ]);

    const teeTimesBooked = teeTimeCountResult.count ?? 0;

    return res.json({
      success: true,
      data: {
        totalUsers: userStats?.total_users ?? 0,
        activeUsers: userStats?.active_users ?? 0,
        teeTimesBooked,
      },
    });
  } catch (error) {
    logger.error("Admin dashboard stats error:", error);
    next(error);
  }
};

/**
 * Search users by phone or name (admin)
 */
const searchUsers = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const users = await userRepository.searchByPhoneOrName(q, limit);
    return res.json({ success: true, data: users || [] });
  } catch (error) {
    logger.error("Admin searchUsers error:", error);
    next(error);
  }
};

/**
 * Get user profile with activity history and Social Rate (admin)
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const [loginLogs, socialRateLogs] = await Promise.all([
      supabaseAdmin.from("login_logs").select("id, login_method, status, attempted_at").eq("user_id", id).order("attempted_at", { ascending: false }).limit(20),
      supabaseAdmin.from("social_rate_logs").select("id, previous_score, delta, new_score, reason, reason_details, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(30),
    ]);
    return res.json({
      success: true,
      data: {
        user,
        activity: {
          loginLogs: loginLogs.data || [],
          socialRateLogs: socialRateLogs.data || [],
        },
      },
    });
  } catch (error) {
    logger.error("Admin getUserProfile error:", error);
    next(error);
  }
};

/**
 * Update user details (admin)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const existing = await userRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const userUpdates = {};
    if (body.first_name !== undefined) userUpdates.firstName = body.first_name;
    if (body.last_name !== undefined) userUpdates.lastName = body.last_name;
    if (body.email !== undefined) userUpdates.email = body.email;
    if (body.username !== undefined) userUpdates.username = body.username;
    if (body.phone_number !== undefined) userUpdates.phoneNumber = body.phone_number;
    if (Object.keys(userUpdates).length > 0) {
      await userRepository.update(id, userUpdates);
    }
    if (body.handicap !== undefined || body.location !== undefined || body.home_course !== undefined || body.bio !== undefined) {
      const profileUpdates = {};
      if (body.handicap !== undefined) profileUpdates.handicap = body.handicap;
      if (body.location !== undefined) profileUpdates.location = body.location;
      if (body.home_course !== undefined) profileUpdates.home_course = body.home_course;
      if (body.bio !== undefined) profileUpdates.bio = body.bio;
      if (Object.keys(profileUpdates).length > 0) {
        await userRepository.updateProfile(id, profileUpdates);
      }
    }
    const updated = await userRepository.findById(id);
    return res.json({ success: true, data: updated });
  } catch (error) {
    logger.error("Admin updateUser error:", error);
    next(error);
  }
};

/**
 * Suspend user (set is_active = false)
 */
const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await userRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const updated = await userRepository.setActive(id, false);
    return res.json({ success: true, data: updated, message: "User suspended." });
  } catch (error) {
    logger.error("Admin suspendUser error:", error);
    next(error);
  }
};

/**
 * Unsuspend user (set is_active = true, clear lock if any)
 */
const unsuspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await userRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const { error } = await supabaseAdmin
      .from("users")
      .update({ is_active: true, is_locked: false, locked_until: null })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
    const updated = await userRepository.findById(id);
    return res.json({ success: true, data: updated, message: "User unsuspended." });
  } catch (error) {
    logger.error("Admin unsuspendUser error:", error);
    next(error);
  }
};

/**
 * Ban user (set is_active = false, is_locked = true)
 */
const banUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await userRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const updated = await userRepository.setLocked(id);
    return res.json({ success: true, data: updated, message: "User banned." });
  } catch (error) {
    logger.error("Admin banUser error:", error);
    next(error);
  }
};

/**
 * List user-reported issues (admin)
 */
const listReports = async (req, res, next) => {
  try {
    const status = req.query.status;
    const reported_user_id = req.query.reported_user_id;
    const limit = parseInt(req.query.limit, 10) || 50;
    let listResult;
    try {
      listResult = await userReportRepository.list({ status, reported_user_id, limit });
    } catch (err) {
      logger.warn("Admin listReports (table may not exist):", err?.message);
      listResult = [];
    }
    const reports = Array.isArray(listResult) ? listResult : [];
    const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
    const reportedIds = [...new Set(reports.map((r) => r.reported_user_id))];
    const userIds = [...new Set([...reporterIds, ...reportedIds])];
    const users = {};
    for (const uid of userIds) {
      try {
        const u = await userRepository.findById(uid);
        if (u) users[uid] = { first_name: u.first_name, last_name: u.last_name, username: u.username, phone_number: u.phone_number };
      } catch (_) {}
    }
    const enriched = reports.map((r) => ({
      ...r,
      reporter: users[r.reporter_id] || null,
      reported_user: users[r.reported_user_id] || null,
    }));
    return res.json({ success: true, data: enriched });
  } catch (error) {
    logger.error("Admin listReports error:", error);
    next(error);
  }
};

/**
 * Update report status (admin)
 */
const updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const updated = await userReportRepository.updateStatus(id, { status, admin_notes });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    logger.error("Admin updateReport error:", error);
    next(error);
  }
};

/**
 * Preview broadcast notification (returns payload for verification; no send)
 */
const previewBroadcast = async (req, res, next) => {
  try {
    const { title, body } = req.body || {};
    const tokenCount = await deviceRepository.getAllPushTokens();
    const count = Array.isArray(tokenCount) ? tokenCount.length : 0;
    return res.json({
      success: true,
      data: {
        title: title || "(No title)",
        body: body || "(No message)",
        recipientCount: count,
        message: `Preview: ${count} device(s) would receive this notification.`,
      },
    });
  } catch (error) {
    logger.error("Admin previewBroadcast error:", error);
    next(error);
  }
};

/**
 * Send broadcast push notification to all users (all devices with push tokens)
 */
const sendBroadcast = async (req, res, next) => {
  try {
    const { title, body } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: "Body is required." });
    }

    const tokens = await deviceRepository.getAllPushTokens();
    const list = Array.isArray(tokens) ? tokens : [];
    if (list.length === 0) {
      return res.json({
        success: true,
        data: { sent: 0, failed: 0, total: 0, message: "No push tokens registered. No notifications sent." },
      });
    }

    let totalSent = 0;
    let totalFailed = 0;
    for (let i = 0; i < list.length; i += BROADCAST_CHUNK_SIZE) {
      const chunk = list.slice(i, i + BROADCAST_CHUNK_SIZE);
      const result = await notificationService.sendPushNotifications(
        chunk,
        String(title).trim(),
        String(body).trim(),
        { type: "broadcast", source: "admin" }
      );
      totalSent += result?.sent ?? 0;
      totalFailed += result?.failed ?? 0;
    }

    return res.json({
      success: true,
      data: {
        sent: totalSent,
        failed: totalFailed,
        total: list.length,
        message: `Broadcast sent: ${totalSent} delivered, ${totalFailed} failed (${list.length} total devices).`,
      },
    });
  } catch (error) {
    logger.error("Admin sendBroadcast error:", error);
    next(error);
  }
};

/**
 * Mask a string for display (show first 4 and last 2 chars, rest as •)
 */
function maskValue(val, minVisible = 4) {
  if (!val || typeof val !== "string") return null;
  const s = val.trim();
  if (s.length <= minVisible + 2) return "••••••";
  return s.slice(0, 4) + "••••••" + s.slice(-2);
}

/**
 * Mask phone/number (e.g. +1234567890 -> +••••••7890)
 */
function maskPhone(val) {
  if (!val || typeof val !== "string") return null;
  const s = val.trim();
  if (s.length < 4) return "••••";
  return s.slice(0, 1) + "••••••" + s.slice(-4);
}

/**
 * Get system settings status (Firebase, Twilio) for admin. No secrets returned.
 */
const getSystemSettings = async (req, res, next) => {
  try {
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "";
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || "";
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || "";
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER || "";

    const firebaseConfigured = !!firebaseProjectId.trim();
    const twilioConfigured =
      !!twilioAccountSid.trim() &&
      !!twilioAuthToken.trim() &&
      !!twilioFromNumber.trim() &&
      twilioAccountSid.startsWith("AC");

    return res.json({
      success: true,
      data: {
        firebase: {
          configured: firebaseConfigured,
          projectIdMasked: firebaseConfigured ? maskValue(firebaseProjectId) : null,
          envVars: ["FIREBASE_PROJECT_ID"],
          description: "Used for OAuth and push notification configuration. Set in backend .env.",
        },
        twilio: {
          configured: twilioConfigured,
          accountSidMasked: twilioAccountSid ? maskValue(twilioAccountSid) : null,
          fromNumberMasked: twilioFromNumber ? maskPhone(twilioFromNumber) : null,
          envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
          description: "Required for SMS magic links and text invites. TWILIO_ACCOUNT_SID must start with AC.",
        },
      },
    });
  } catch (error) {
    logger.error("Admin getSystemSettings error:", error);
    next(error);
  }
};

module.exports = {
  login,
  getDashboardStats,
  searchUsers,
  getUserProfile,
  updateUser,
  suspendUser,
  unsuspendUser,
  banUser,
  listReports,
  updateReport,
  previewBroadcast,
  sendBroadcast,
  getSystemSettings,
};

const { generateAdminToken, generateAdminMfaPendingToken, verifyAdminMfaPendingToken } = require("../../utils/crypto");
const speakeasy = require("speakeasy");
const userRepository = require("../../repositories/userRepository");
const userReportRepository = require("../../repositories/userReportRepository");
const courseRepository = require("../../repositories/courseRepository");
const clubsService = require("../../services/clubsService");
const adSlotRepository = require("../../repositories/adSlotRepository");
const adCreativeUploadService = require("../../services/adCreativeUploadService");
const deviceRepository = require("../../repositories/deviceRepository");
const notificationService = require("../../services/notificationService");
const { supabaseAdmin } = require("../../config/supabase");
const logger = require("../../config/logger");

const BROADCAST_CHUNK_SIZE = 100; // Expo recommends ≤100 messages per request

/**
 * Super admin login.
 * Credentials from env: SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD.
 * If SUPER_ADMIN_MFA_SECRET is set (base32 TOTP secret), login returns a temporaryToken
 * and requires POST /api/admin/mfa/verify with the 6-digit code from an authenticator app.
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

    const mfaSecret = process.env.SUPER_ADMIN_MFA_SECRET || "";
    if (mfaSecret.trim()) {
      const temporaryToken = generateAdminMfaPendingToken({ sub: "super_admin" }, "5m");
      return res.json({
        success: true,
        needsMfaVerification: true,
        message: "Enter your authenticator code.",
        temporaryToken,
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
 * Verify MFA code and issue full admin access token.
 * Body: { temporaryToken, code } (code = 6-digit TOTP)
 */
const mfaVerify = async (req, res, next) => {
  try {
    const { temporaryToken, code } = req.body;
    if (!temporaryToken || !code) {
      return res.status(400).json({
        success: false,
        message: "Temporary token and code are required.",
      });
    }

    const mfaSecret = process.env.SUPER_ADMIN_MFA_SECRET || "";
    if (!mfaSecret.trim()) {
      return res.status(503).json({
        success: false,
        message: "MFA is not configured.",
      });
    }

    let decoded;
    try {
      decoded = verifyAdminMfaPendingToken(temporaryToken);
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please sign in again.",
      });
    }

    const tokenTrimmed = String(code).trim().replace(/\s/g, "");
    const valid = speakeasy.totp.verify({
      secret: mfaSecret.trim(),
      encoding: "base32",
      token: tokenTrimmed,
      window: 1,
    });

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired code. Please try again.",
      });
    }

    const accessToken = generateAdminToken({ sub: decoded.sub || "super_admin" }, "8h");
    return res.json({
      success: true,
      message: "Login successful.",
      accessToken,
      expiresIn: "8h",
    });
  } catch (error) {
    logger.error("Admin MFA verify error:", error);
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
 * Most frequently used courses (by tee time count). For platform usage tracking.
 * Uses get_course_usage() if available; otherwise aggregates in memory from tee_times.
 */
const getCourseUsage = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    let rows = [];

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("get_course_usage", { p_limit: limit });
    if (!rpcError && Array.isArray(rpcData) && rpcData.length >= 0) {
      rows = rpcData.map((r) => ({
        course_name: r.course_name ?? "",
        course_location: r.course_location ?? "",
        tee_time_count: Number(r.tee_time_count) || 0,
      }));
    } else {
      const { data: ttRows, error: ttError } = await supabaseAdmin
        .from("tee_times")
        .select("course_name, course_location");
      if (ttError) throw ttError;
      const map = new Map();
      for (const row of ttRows || []) {
        const key = `${row.course_name || ""}\n${row.course_location || ""}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
      rows = Array.from(map.entries())
        .map(([key, tee_time_count]) => {
          const [course_name, course_location] = key.split("\n");
          return { course_name, course_location, tee_time_count };
        })
        .sort((a, b) => b.tee_time_count - a.tee_time_count)
        .slice(0, limit);
    }

    return res.json({ success: true, data: rows });
  } catch (error) {
    logger.error("Admin getCourseUsage error:", error);
    next(error);
  }
};

/**
 * Search users by phone or name (admin)
 */
const searchUsers = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const result = await userRepository.searchByPhoneOrName(q, limit, offset);
    return res.json({ success: true, data: result?.users || [], total: result?.total ?? 0 });
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
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    let listResult;
    try {
      listResult = await userReportRepository.list({ status, reported_user_id, limit, offset });
    } catch (err) {
      logger.warn("Admin listReports (table may not exist):", err?.message);
      listResult = { data: [], total: 0 };
    }
    const reports = Array.isArray(listResult?.data) ? listResult.data : (listResult?.data ? [listResult.data] : []);
    const totalReports = typeof listResult?.total === "number" ? listResult.total : reports.length;
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
    return res.json({ success: true, data: enriched, total: totalReports });
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

// ---------- Golf courses (admin CRUD for autocomplete database) ----------
const listCourses = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const result = await courseRepository.listCourses(q, limit, offset);
    return res.json({ success: true, data: result?.courses || [], total: result?.total ?? 0 });
  } catch (error) {
    logger.error("Admin listCourses error:", error);
    next(error);
  }
};

const getCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await courseRepository.getCourseById(id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found." });
    return res.json({ success: true, data: course });
  } catch (error) {
    logger.error("Admin getCourse error:", error);
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    const course = await courseRepository.createCourse(req.body);
    if (!course) return res.status(400).json({ success: false, message: "Failed to create course." });
    return res.status(201).json({ success: true, data: course, message: "Course added." });
  } catch (error) {
    logger.error("Admin createCourse error:", error);
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await courseRepository.getCourseById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Course not found." });
    const course = await courseRepository.updateCourse(id, req.body);
    return res.json({ success: true, data: course, message: "Course updated." });
  } catch (error) {
    logger.error("Admin updateCourse error:", error);
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await courseRepository.getCourseById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Course not found." });
    await courseRepository.deleteCourse(id);
    return res.json({ success: true, message: "Course removed." });
  } catch (error) {
    logger.error("Admin deleteCourse error:", error);
    next(error);
  }
};

// ---------- Golf courses CSV (read from / add to backend/data/clubs.csv) ----------
const listCsvCourses = async (req, res, next) => {
  try {
    await clubsService.loadClubs();
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { clubs, total } = clubsService.getClubsForAdmin(q || undefined, limit, offset);
    return res.json({ success: true, data: clubs, total });
  } catch (error) {
    logger.error("Admin listCsvCourses error:", error);
    next(error);
  }
};

const addCsvCourse = async (req, res, next) => {
  try {
    const { name, address, city, state, country, postal_code, postalCode, latitude, longitude, phone, telephone, website } = req.body || {};
    const nameTrimmed = (name && String(name).trim()) || "";
    if (!nameTrimmed) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    await clubsService.loadClubs();
    const club = await clubsService.appendClubToCsv({
      name: nameTrimmed,
      address: address ? String(address).trim() : undefined,
      city: city ? String(city).trim() : undefined,
      state: state ? String(state).trim() : undefined,
      country: (country && String(country).trim()) || "USA",
      postal_code: postal_code || postalCode,
      latitude: latitude != null ? parseFloat(latitude) : undefined,
      longitude: longitude != null ? parseFloat(longitude) : undefined,
      phone: phone || telephone,
      telephone: telephone || phone,
      website: website ? String(website).trim() : undefined,
    });
    return res.status(201).json({ success: true, data: club, message: "Course added to CSV." });
  } catch (error) {
    logger.error("Admin addCsvCourse error:", error);
    next(error);
  }
};

const updateCsvCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, country, postal_code, postalCode, latitude, longitude, phone, telephone, website } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "Course ID is required." });
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (address !== undefined) updates.address = String(address).trim();
    if (city !== undefined) updates.city = String(city).trim();
    if (state !== undefined) updates.state = String(state).trim();
    if (country !== undefined) updates.country = (country && String(country).trim()) || "USA";
    if (postal_code !== undefined || postalCode !== undefined) updates.postal_code = (postal_code || postalCode || "").toString().trim();
    if (latitude !== undefined) updates.latitude = latitude != null ? parseFloat(latitude) : null;
    if (longitude !== undefined) updates.longitude = longitude != null ? parseFloat(longitude) : null;
    if (phone !== undefined || telephone !== undefined) updates.telephone = (telephone || phone || "").toString().trim();
    if (website !== undefined) updates.website = website ? String(website).trim() : null;
    const club = await clubsService.updateClubInCsv(id, updates);
    if (!club) return res.status(404).json({ success: false, message: "Course not found." });
    return res.json({ success: true, data: club, message: "Course updated." });
  } catch (error) {
    logger.error("Admin updateCsvCourse error:", error);
    next(error);
  }
};

const deleteCsvCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Course ID is required." });
    const deleted = await clubsService.deleteClubFromCsv(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Course not found." });
    return res.json({ success: true, message: "Course deleted." });
  } catch (error) {
    logger.error("Admin deleteCsvCourse error:", error);
    next(error);
  }
};

// ---------- Ad slots (4 placements: loading screen + 3 banners) ----------
const VALID_SLOT_KEYS = ["loading_screen", "banner_1", "banner_2", "banner_3"];

const listAdSlots = async (req, res, next) => {
  try {
    const slots = await adSlotRepository.listAll();
    return res.json({ success: true, data: slots });
  } catch (error) {
    logger.error("Admin listAdSlots error:", error);
    next(error);
  }
};

const updateAdSlot = async (req, res, next) => {
  try {
    const { slotKey } = req.params;
    if (!VALID_SLOT_KEYS.includes(slotKey)) {
      return res.status(400).json({ success: false, message: "Invalid slot key. Use: loading_screen, banner_1, banner_2, banner_3." });
    }
    const { label, image_url, link_url, active, sort_order } = req.body || {};
    const payload = {};
    if (label !== undefined) payload.label = String(label).trim() || null;
    if (image_url !== undefined) payload.image_url = image_url == null || image_url === "" ? null : String(image_url).trim();
    if (link_url !== undefined) payload.link_url = link_url == null || link_url === "" ? null : String(link_url).trim();
    if (typeof active === "boolean") payload.active = active;
    if (typeof sort_order === "number") payload.sort_order = sort_order;
    const updated = await adSlotRepository.updateBySlotKey(slotKey, payload);
    if (!updated) return res.status(500).json({ success: false, message: "Failed to update ad slot." });
    return res.json({ success: true, data: updated, message: "Ad slot updated." });
  } catch (error) {
    logger.error("Admin updateAdSlot error:", error);
    next(error);
  }
};

/**
 * Upload ad creative asset for a slot. Body: { imageBase64: "data:image/...;base64,..." }.
 * Stores in Supabase Storage and sets slot.image_url to the public URL.
 */
const uploadAdSlotAsset = async (req, res, next) => {
  try {
    const { slotKey } = req.params;
    if (!VALID_SLOT_KEYS.includes(slotKey)) {
      return res.status(400).json({ success: false, message: "Invalid slot key." });
    }
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: "imageBase64 is required." });
    }
    const publicUrl = await adCreativeUploadService.uploadAdCreative(slotKey, imageBase64);
    const updated = await adSlotRepository.updateBySlotKey(slotKey, { image_url: publicUrl });
    if (!updated) return res.status(500).json({ success: false, message: "Slot updated but failed to save URL." });
    return res.json({ success: true, data: updated, image_url: publicUrl, message: "Creative uploaded." });
  } catch (error) {
    logger.error("Admin uploadAdSlotAsset error:", error);
    return res.status(400).json({ success: false, message: error.message || "Upload failed." });
  }
};

/**
 * Remove ad creative asset for a slot: clear image_url and delete file from storage if it was ours.
 */
const removeAdSlotAsset = async (req, res, next) => {
  try {
    const { slotKey } = req.params;
    if (!VALID_SLOT_KEYS.includes(slotKey)) {
      return res.status(400).json({ success: false, message: "Invalid slot key." });
    }
    const slot = await adSlotRepository.getBySlotKey(slotKey);
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found." });
    const currentUrl = slot.image_url || null;
    if (currentUrl) {
      await adCreativeUploadService.deleteAdCreativeByUrl(currentUrl);
    }
    const updated = await adSlotRepository.updateBySlotKey(slotKey, { image_url: null });
    if (!updated) return res.status(500).json({ success: false, message: "Failed to clear slot." });
    return res.json({ success: true, data: updated, message: "Creative removed." });
  } catch (error) {
    logger.error("Admin removeAdSlotAsset error:", error);
    next(error);
  }
};

module.exports = {
  login,
  mfaVerify,
  getDashboardStats,
  getCourseUsage,
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
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listCsvCourses,
  addCsvCourse,
  updateCsvCourse,
  deleteCsvCourse,
  listAdSlots,
  updateAdSlot,
  uploadAdSlotAsset,
  removeAdSlotAsset,
};

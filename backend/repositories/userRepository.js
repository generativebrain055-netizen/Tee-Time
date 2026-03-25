const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * User Repository - Supabase REST API
 * Handles all database operations related to users
 *
 * IDENTITY ARCHITECTURE:
 * - User identity is the `id` (UUID) - NOT phone, NOT email
 * - Phone number is OPTIONAL profile data
 * - Email is OPTIONAL profile data
 * - For OAuth users, identity comes from auth_providers table
 */

/**
 * Find user by phone number with profile
 * NOTE: This is for PROFILE lookup only, not identity verification
 * @param {string} phoneNumber
 * @returns {Promise<Object|null>}
 */
const findByPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) return null;

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        *,
        user_profiles (*)
      `,
      )
      .eq("phone_number", phoneNumber)
      .is("deleted_at", null)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows

    if (!data) return null;

    // Flatten profile data - handle both array and object responses
    const profileData = data.user_profiles;
    const profile = Array.isArray(profileData)
      ? profileData[0] || {}
      : profileData || {};
    delete data.user_profiles;

    // Prevent profile ID from overwriting user ID
    if (profile.id) {
      profile.profile_id = profile.id;
      delete profile.id;
    }

    return { ...data, ...profile };
  } catch (error) {
    handleError(error, "findByPhoneNumber");
  }
};

/**
 * Find user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const findByEmail = async (email) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .is("deleted_at", null)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    handleError(error, "findByEmail");
  }
};

/**
 * Find user by ID with profile
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findById = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        *,
        user_profiles (*)
      `,
      )
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) return null;

    // Flatten profile data - handle both array and object responses
    const profileData = data.user_profiles;
    const profile = Array.isArray(profileData)
      ? profileData[0] || {}
      : profileData || {};
    delete data.user_profiles;

    // Prevent profile ID from overwriting user ID
    if (profile.id) {
      profile.profile_id = profile.id;
      delete profile.id;
    }

    return { ...data, ...profile };
  } catch (error) {
    handleError(error, "findById");
  }
};

/**
 * Find user by username with profile
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
const findByUsername = async (username) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        *,
        user_profiles (*)
      `,
      )
      .eq("username", username)
      .is("deleted_at", null)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) return null;

    // Flatten profile data
    const profile = data.user_profiles?.[0] || {};
    delete data.user_profiles;

    // Prevent profile ID from overwriting user ID
    if (profile.id) {
      profile.profile_id = profile.id;
      delete profile.id;
    }

    return { ...data, ...profile };
  } catch (error) {
    handleError(error, "findByUsername");
  }
};

/**
 * Create a new user with profile
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
const create = async (userData) => {
  const {
    phoneNumber,
    email,
    username,
    firstName,
    lastName,
    handicap,
    passwordHash,
    isVerified,
    location,
    homeCourse,
    clubs, // Support clubs array
    preferredTeeTime,
    walkOrRide,
    playingPartnerPreference,
    drinkOfChoice,
    zipCode,
    avatarUrl,
  } = userData;

  try {
    // Create user
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        phone_number: phoneNumber || null,
        email: email || null,
        username: username || null,
        first_name: firstName || null,
        last_name: lastName || null,
        password_hash: passwordHash || null,
        is_verified: isVerified || false,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Normalize clubs: use clubs array if provided, otherwise fall back to homeCourse
    const clubsArray = Array.isArray(clubs) && clubs.length > 0
      ? clubs
      : homeCourse
        ? [{ name: homeCourse, location: null, type: "Public" }]
        : [];

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: user.id,
        handicap: handicap ? parseFloat(handicap) : null,
        location: location || null,
        home_course: clubsArray.length > 0 ? clubsArray[0].name : (homeCourse || null), // First club as homeCourse for backward compatibility
        clubs: clubsArray.length > 0 ? clubsArray : [], // Save clubs as JSONB array (use empty array instead of null to match schema default)
        preferred_tee_time: preferredTeeTime || null,
        walk_or_ride: walkOrRide || null,
        playing_partner_preference: playingPartnerPreference || null,
        drink_of_choice: drinkOfChoice || null,
        zip_code: zipCode || null,
        avatar_url: avatarUrl || null,
      });

    if (profileError) throw profileError;

    return {
      ...user,
      handicap: handicap ? parseFloat(handicap) : null,
      social_rate: 100,
      location,
      home_course: clubsArray.length > 0 ? clubsArray[0].name : (homeCourse || null),
      clubs: clubsArray.length > 0 ? clubsArray : [], // Use empty array to match schema default
      preferred_tee_time: preferredTeeTime,
      walk_or_ride: walkOrRide,
      playing_partner_preference: playingPartnerPreference,
      drink_of_choice: drinkOfChoice || null,
      zip_code: zipCode || null,
      avatar_url: avatarUrl || null,
    };
  } catch (error) {
    handleError(error, "create user");
  }
};

/**
 * Update user by ID
 * @param {string} userId
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
const update = async (userId, userData) => {
  const {
    firstName,
    lastName,
    username,
    handicap,
    passwordHash,
    isVerified,
    email,
  } = userData;

  try {
    // Update users table
    const userUpdates = {};
    if (firstName !== undefined) userUpdates.first_name = firstName;
    if (lastName !== undefined) userUpdates.last_name = lastName;
    if (username !== undefined) userUpdates.username = username;
    if (passwordHash !== undefined) userUpdates.password_hash = passwordHash;
    if (isVerified !== undefined) userUpdates.is_verified = isVerified;
    if (email !== undefined) userUpdates.email = email;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabaseAdmin
        .from("users")
        .update(userUpdates)
        .eq("id", userId)
        .is("deleted_at", null);

      if (userError) throw userError;
    }

    // Update profile if handicap provided
    if (handicap !== undefined) {
      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .update({ handicap: handicap ? parseFloat(handicap) : null })
        .eq("user_id", userId);

      if (profileError) throw profileError;
    }

    return findById(userId);
  } catch (error) {
    handleError(error, "update user");
  }
};

/**
 * Update user password
 * @param {string} userId
 * @param {string} passwordHash
 * @returns {Promise<Object>}
 */
const updatePassword = async (userId, passwordHash) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", userId)
      .is("deleted_at", null)
      .select("id, phone_number, email")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "updatePassword");
  }
};

/**
 * Convert camelCase to snake_case
 */
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
};

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
const updateProfile = async (userId, updates) => {
  const userFields = ["first_name", "last_name", "email", "phone_number"];
  const profileFields = [
    "handicap",
    "location",
    "home_course",
    "bio",
    "preferred_tee_time",
    "walk_or_ride",
    "playing_partner_preference",
    "drink_of_choice",
    "avatar_url",
    "zip_code",
    "timezone",
    "language",
    "clubs",
  ];

  const logger = require("../config/logger");
  logger.debug("[UPDATE_PROFILE] Input updates", updates);

  try {
    // Build user table updates
    const userUpdates = {};
    Object.keys(updates).forEach((key) => {
      const snakeKey = toSnakeCase(key);
      if (userFields.includes(snakeKey)) {
        userUpdates[snakeKey] = updates[key];
      }
    });

    // Update users table
    if (Object.keys(userUpdates).length > 0) {
      logger.debug("[UPDATE_PROFILE] User table updates", userUpdates);
      const { error: userError } = await supabaseAdmin
        .from("users")
        .update(userUpdates)
        .eq("id", userId)
        .is("deleted_at", null);

      if (userError) throw userError;
    }

    // Build profile table updates
    const profileUpdates = {};
    Object.keys(updates).forEach((key) => {
      const snakeKey = toSnakeCase(key);
      if (profileFields.includes(snakeKey)) {
        if (snakeKey === "handicap") {
          profileUpdates[snakeKey] =
            updates[key] !== null && updates[key] !== ""
              ? parseFloat(updates[key])
              : null;
        } else if (snakeKey === "clubs") {
          // Handle clubs as JSONB array
          profileUpdates[snakeKey] = Array.isArray(updates[key]) ? updates[key] : [];
        } else {
          profileUpdates[snakeKey] = updates[key];
        }
      }
    });

    // Update user_profiles table
    if (Object.keys(profileUpdates).length > 0) {
      logger.debug("[UPDATE_PROFILE] Profile table updates", profileUpdates);
      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .update(profileUpdates)
        .eq("user_id", userId);

      if (profileError) throw profileError;
    }

    return findById(userId);
  } catch (error) {
    handleError(error, "updateProfile");
  }
};

/**
 * Update last login information
 */
const updateLastLogin = async (userId, ipAddress, deviceId = null) => {
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress,
        failed_login_attempts: 0,
      })
      .eq("id", userId);

    if (error) throw error;
  } catch (error) {
    handleError(error, "updateLastLogin");
  }
};

/**
 * Increment failed login attempts
 */
const incrementFailedLoginAttempts = async (userId) => {
  try {
    // Get current attempts
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("failed_login_attempts")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    const newAttempts = (user.failed_login_attempts || 0) + 1;
    const updates = {
      failed_login_attempts: newAttempts,
    };

    if (newAttempts >= 5) {
      updates.is_locked = true;
      updates.locked_until = new Date(
        Date.now() + 30 * 60 * 1000,
      ).toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("failed_login_attempts, is_locked, locked_until")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "incrementFailedLoginAttempts");
  }
};

/**
 * Reset failed login attempts
 */
const resetFailedLoginAttempts = async (userId) => {
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        failed_login_attempts: 0,
        is_locked: false,
        locked_until: null,
      })
      .eq("id", userId);

    if (error) throw error;
  } catch (error) {
    handleError(error, "resetFailedLoginAttempts");
  }
};

/**
 * Verify user
 */
const verifyUser = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ is_verified: true })
      .eq("id", userId)
      .is("deleted_at", null)
      .select("id, phone_number, email, is_verified")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "verifyUser");
  }
};

/**
 * Update notification preferences
 */
const updateNotificationPreferences = async (userId, preferences) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update({ notification_preferences: preferences })
      .eq("user_id", userId)
      .select("id, notification_preferences")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "updateNotificationPreferences");
  }
};

/**
 * Soft delete user
 */
const softDelete = async (userId) => {
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", userId);

    if (error) throw error;
  } catch (error) {
    handleError(error, "softDelete");
  }
};

/**
 * Check if phone number exists
 */
const phoneNumberExists = async (phoneNumber) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", phoneNumber)
      .is("deleted_at", null);

    if (error) throw error;
    return data !== null;
  } catch (error) {
    handleError(error, "phoneNumberExists");
  }
};

/**
 * Check if email exists
 */
const emailExists = async (email) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .is("deleted_at", null);

    if (error) throw error;
    return data !== null;
  } catch (error) {
    handleError(error, "emailExists");
  }
};

/**
 * Get user statistics
 */
const getStatistics = async () => {
  try {
    const { count: totalUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const { count: activeUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .is("deleted_at", null);

    const { count: verifiedUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_verified", true)
      .is("deleted_at", null);

    return {
      total_users: totalUsers || 0,
      active_users: activeUsers || 0,
      verified_users: verifiedUsers || 0,
    };
  } catch (error) {
    handleError(error, "getStatistics");
  }
};

/**
 * Get public profile
 */
const getPublicProfile = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        id, first_name, last_name, username,
        user_profiles (
          handicap, social_rate, avatar_url, location, home_course,
          preferred_tee_time, walk_or_ride, bio, rounds_played, average_score
        )
      `,
      )
      .eq("id", userId)
      .is("deleted_at", null)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) return null;

    const profile = data.user_profiles?.[0] || {};
    delete data.user_profiles;
    return { ...data, ...profile };
  } catch (error) {
    handleError(error, "getPublicProfile");
  }
};

/**
 * Admin: search users by phone number or name (first_name, last_name, username)
 * @param {string} q - search term
 * @param {number} limit - max results (default 50)
 * @param {number} offset - pagination offset (default 0)
 * @returns {Promise<{ users: Array, total: number }>}
 */
const searchByPhoneOrName = async (q, limit = 50, offset = 0) => {
  try {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
    const selectFields = `
        id, phone_number, email, username, first_name, last_name,
        is_active, is_verified, is_locked, created_at,
        user_profiles (social_rate, handicap, avatar_url)
      `;
    const mapRow = (row) => {
      const profile = row.user_profiles?.[0] || row.user_profiles || {};
      const { user_profiles, ...user } = row;
      return { ...user, social_rate: profile.social_rate, handicap: profile.handicap, avatar_url: profile.avatar_url };
    };

    const sanitized = typeof q === "string" ? String(q).trim().replace(/%/g, "").replace(/,/g, "") : "";
    if (!sanitized) {
      const { data, error, count } = await supabaseAdmin
        .from("users")
        .select(selectFields, { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1);
      if (error) throw error;
      return { users: (data || []).map(mapRow), total: count ?? 0 };
    }

    const term = `%${sanitized}%`;
    const orFilter = `phone_number.ilike.${term},email.ilike.${term},username.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`;
    const { data, error, count } = await supabaseAdmin
      .from("users")
      .select(selectFields, { count: "exact" })
      .is("deleted_at", null)
      .or(orFilter)
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);
    if (error) throw error;
    return { users: (data || []).map(mapRow), total: count ?? 0 };
  } catch (error) {
    handleError(error, "searchByPhoneOrName");
  }
};

/**
 * Admin: set user active flag (suspend/unsuspend)
 * @param {string} userId
 * @param {boolean} isActive
 */
const setActive = async (userId, isActive) => {
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .update({ is_active: !!isActive })
      .eq("id", userId)
      .is("deleted_at", null);
    if (error) throw error;
    return findById(userId);
  } catch (error) {
    handleError(error, "setActive");
  }
};

/**
 * Admin: lock user (ban) - set is_active false and is_locked true with long lock
 * @param {string} userId
 * @param {string} [reason]
 */
const setLocked = async (userId) => {
  try {
    const lockedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // ~100 years
    const { error } = await supabaseAdmin
      .from("users")
      .update({ is_active: false, is_locked: true, locked_until: lockedUntil })
      .eq("id", userId)
      .is("deleted_at", null);
    if (error) throw error;
    return findById(userId);
  } catch (error) {
    handleError(error, "setLocked");
  }
};

module.exports = {
  findByPhoneNumber,
  findByEmail,
  findById,
  findByUsername,
  create,
  update,
  updatePassword,
  updateProfile,
  updateLastLogin,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  verifyUser,
  updateNotificationPreferences,
  softDelete,
  phoneNumberExists,
  emailExists,
  getStatistics,
  getPublicProfile,
  searchByPhoneOrName,
  setActive,
  setLocked,
};

const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * User Repository - Supabase REST API
 * Handles all database operations related to users
 */

/**
 * Find user by phone number with profile
 * @param {string} phoneNumber
 * @returns {Promise<Object|null>}
 */
const findByPhoneNumber = async (phoneNumber) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        *,
        user_profiles (*)
      `
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
      `
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
      `
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
    preferredTeeTime,
    walkOrRide,
    playingPartnerPreference,
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

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: user.id,
        handicap: handicap ? parseFloat(handicap) : null,
        location: location || null,
        home_course: homeCourse || null,
        preferred_tee_time: preferredTeeTime || null,
        walk_or_ride: walkOrRide || null,
        playing_partner_preference: playingPartnerPreference || null,
      });

    if (profileError) throw profileError;

    return {
      ...user,
      handicap: handicap ? parseFloat(handicap) : null,
      social_rate: 5.0,
      location,
      home_course: homeCourse,
      preferred_tee_time: preferredTeeTime,
      walk_or_ride: walkOrRide,
      playing_partner_preference: playingPartnerPreference,
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
  const userFields = ["first_name", "last_name", "email"];
  const profileFields = [
    "handicap",
    "location",
    "home_course",
    "bio",
    "preferred_tee_time",
    "walk_or_ride",
    "playing_partner_preference",
    "avatar_url",
    "timezone",
    "language",
  ];

  console.log("[UPDATE_PROFILE] Input updates:", updates);

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
      console.log("[UPDATE_PROFILE] User table updates:", userUpdates);
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
        } else {
          profileUpdates[snakeKey] = updates[key];
        }
      }
    });

    // Update user_profiles table
    if (Object.keys(profileUpdates).length > 0) {
      console.log("[UPDATE_PROFILE] Profile table updates:", profileUpdates);
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
        Date.now() + 30 * 60 * 1000
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
      `
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
};

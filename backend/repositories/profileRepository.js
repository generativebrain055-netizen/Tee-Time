const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Profile Repository - Supabase REST API
 * Handles all database operations related to user profiles
 */

/**
 * Find profile by user ID
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findByUserId = async (userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("user_profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (error) {
        handleError(error, "findByUserId");
    }
};

/**
 * Create a new profile for a user
 * @param {string} userId
 * @param {Object} profileData
 * @returns {Promise<Object>}
 */
const create = async (userId, profileData = {}) => {
    const {
        handicap,
        socialRate,
        avatarUrl,
        bio,
        location,
        homeCourse,
        driver,
        irons,
        putter,
        ball,
        preferredTeeTime,
        walkOrRide,
        playingPartnerPreference,
        timezone,
        language,
    } = profileData;

    try {
        const { data, error } = await supabaseAdmin
            .from("user_profiles")
            .insert({
                user_id: userId,
                handicap: handicap || null,
                social_rate: socialRate ?? 100,
                avatar_url: avatarUrl || null,
                bio: bio || null,
                location: location || null,
                home_course: homeCourse || null,
                driver: driver || null,
                irons: irons || null,
                putter: putter || null,
                ball: ball || null,
                preferred_tee_time: preferredTeeTime || null,
                walk_or_ride: walkOrRide || 'ride',
                playing_partner_preference: playingPartnerPreference || null,
                timezone: timezone || 'UTC',
                language: language || 'en',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "create profile");
    }
};

/**
 * Update profile by user ID
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
const update = async (userId, updates) => {
    const allowedFields = {
        handicap: 'handicap',
        socialRate: 'social_rate',
        avatarUrl: 'avatar_url',
        bio: 'bio',
        location: 'location',
        homeCourse: 'home_course',
        driver: 'driver',
        irons: 'irons',
        putter: 'putter',
        ball: 'ball',
        preferredTeeTime: 'preferred_tee_time',
        walkOrRide: 'walk_or_ride',
        playingPartnerPreference: 'playing_partner_preference',
        timezone: 'timezone',
        language: 'language',
        notificationPreferences: 'notification_preferences',
        privacySettings: 'privacy_settings',
        roundsPlayed: 'rounds_played',
        averageScore: 'average_score',
    };

    const updateData = {};

    Object.keys(updates).forEach((key) => {
        if (allowedFields[key]) {
            const dbField = allowedFields[key];
            
            // Handle JSON fields
            if (key === 'notificationPreferences' || key === 'privacySettings') {
                updateData[dbField] = updates[key]; // Supabase handles JSON automatically
            } else {
                updateData[dbField] = updates[key];
            }
        }
    });

    if (Object.keys(updateData).length === 0) {
        return findByUserId(userId);
    }

    try {
        const { data, error } = await supabaseAdmin
            .from("user_profiles")
            .update(updateData)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "update profile");
    }
};

/**
 * Upsert profile (create if not exists, update if exists)
 * @param {string} userId
 * @param {Object} profileData
 * @returns {Promise<Object>}
 */
const upsert = async (userId, profileData) => {
    const existing = await findByUserId(userId);
    if (existing) {
        return update(userId, profileData);
    }
    return create(userId, profileData);
};

/**
 * Get user with profile (joined query)
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const getUserWithProfile = async (userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select(`
                id, phone_number, email, username, first_name, last_name,
                is_active, is_verified, created_at,
                user_profiles (
                    handicap, social_rate, avatar_url, bio, location, home_course,
                    driver, irons, putter, ball,
                    preferred_tee_time, walk_or_ride, playing_partner_preference,
                    timezone, language, notification_preferences, privacy_settings,
                    rounds_played, average_score
                )
            `)
            .eq("id", userId)
            .is("deleted_at", null)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (!data) return null;
        
        // Flatten profile data
        const profile = data.user_profiles?.[0] || {};
        delete data.user_profiles;
        return { ...data, ...profile };
    } catch (error) {
        handleError(error, "getUserWithProfile");
    }
};

/**
 * Deep-merge incoming notification preferences onto existing JSON (partial PATCH safe).
 * @param {Object|null|undefined} existing
 * @param {Object} incoming
 */
function mergeNotificationPreferences(existing, incoming) {
    if (!incoming || typeof incoming !== "object") {
        return existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
    }
    const base =
        existing && typeof existing === "object" && !Array.isArray(existing)
            ? { ...existing }
            : {};
    for (const [k, v] of Object.entries(incoming)) {
        if (v === undefined) continue;
        if (k === "types" && v && typeof v === "object" && !Array.isArray(v)) {
            base.types = base.types && typeof base.types === "object" ? { ...base.types } : {};
            for (const [typeKey, typeVal] of Object.entries(v)) {
                if (typeVal && typeof typeVal === "object" && !Array.isArray(typeVal)) {
                    base.types[typeKey] = { ...(base.types[typeKey] || {}), ...typeVal };
                } else {
                    base.types[typeKey] = typeVal;
                }
            }
        } else {
            base[k] = v;
        }
    }
    return base;
}

/**
 * Update notification preferences (merges with existing so partial updates do not wipe fields)
 * @param {string} userId
 * @param {Object} preferences
 * @returns {Promise<Object>}
 */
const updateNotificationPreferences = async (userId, preferences) => {
    try {
        const existing = await findByUserId(userId);
        const current = existing?.notification_preferences || {};
        const merged = mergeNotificationPreferences(current, preferences);

        const { data, error } = await supabaseAdmin
            .from("user_profiles")
            .update({ notification_preferences: merged })
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
 * Update privacy settings
 * @param {string} userId
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
const updatePrivacySettings = async (userId, settings) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("user_profiles")
            .update({ privacy_settings: settings })
            .eq("user_id", userId)
            .select("id, privacy_settings")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "updatePrivacySettings");
    }
};

/**
 * Increment rounds played
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const incrementRoundsPlayed = async (userId) => {
    try {
        // Get current value
        const { data: current, error: fetchError } = await supabaseAdmin
            .from("user_profiles")
            .select("rounds_played")
            .eq("user_id", userId)
            .single();

        if (fetchError) throw fetchError;

        // Increment
        const { data, error } = await supabaseAdmin
            .from("user_profiles")
            .update({ rounds_played: (current.rounds_played || 0) + 1 })
            .eq("user_id", userId)
            .select("rounds_played")
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleError(error, "incrementRoundsPlayed");
    }
};

module.exports = {
    findByUserId,
    create,
    update,
    upsert,
    getUserWithProfile,
    updateNotificationPreferences,
    updatePrivacySettings,
    incrementRoundsPlayed,
};

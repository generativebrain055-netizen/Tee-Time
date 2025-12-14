const { query } = require("../config/database");

/**
 * Profile Repository
 * Handles all database operations related to user profiles
 */

/**
 * Find profile by user ID
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findByUserId = async (userId) => {
    const result = await query(
        `SELECT id, user_id, handicap, social_rate, avatar_url, bio, location, home_course,
                driver, irons, putter, ball,
                preferred_tee_time, walk_or_ride, playing_partner_preference,
                timezone, language, notification_preferences, privacy_settings,
                rounds_played, average_score, created_at, updated_at
         FROM user_profiles 
         WHERE user_id = $1 
         LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
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

    const result = await query(
        `INSERT INTO user_profiles (
            user_id, handicap, social_rate, avatar_url, bio, location, home_course,
            driver, irons, putter, ball,
            preferred_tee_time, walk_or_ride, playing_partner_preference,
            timezone, language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
            userId,
            handicap || null,
            socialRate || 5.0,
            avatarUrl || null,
            bio || null,
            location || null,
            homeCourse || null,
            driver || null,
            irons || null,
            putter || null,
            ball || null,
            preferredTeeTime || null,
            walkOrRide || 'ride',
            playingPartnerPreference || null,
            timezone || 'UTC',
            language || 'en',
        ]
    );

    return result.rows[0];
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

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
        if (allowedFields[key]) {
            const dbField = allowedFields[key];
            setClauses.push(`${dbField} = $${paramIndex++}`);
            
            // Handle JSON fields
            if (key === 'notificationPreferences' || key === 'privacySettings') {
                values.push(JSON.stringify(updates[key]));
            } else {
                values.push(updates[key]);
            }
        }
    });

    if (setClauses.length === 0) {
        return findByUserId(userId);
    }

    values.push(userId);

    const result = await query(
        `UPDATE user_profiles 
         SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE user_id = $${paramIndex}
         RETURNING *`,
        values
    );

    return result.rows[0];
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
    const result = await query(
        `SELECT 
            u.id, u.phone_number, u.email, u.username, u.first_name, u.last_name,
            u.is_active, u.is_verified, u.created_at,
            p.handicap, p.social_rate, p.avatar_url, p.bio, p.location, p.home_course,
            p.driver, p.irons, p.putter, p.ball,
            p.preferred_tee_time, p.walk_or_ride, p.playing_partner_preference,
            p.timezone, p.language, p.notification_preferences, p.privacy_settings,
            p.rounds_played, p.average_score
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = $1 AND u.deleted_at IS NULL
         LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
};

/**
 * Update notification preferences
 * @param {string} userId
 * @param {Object} preferences
 * @returns {Promise<Object>}
 */
const updateNotificationPreferences = async (userId, preferences) => {
    const result = await query(
        `UPDATE user_profiles 
         SET notification_preferences = $1, updated_at = NOW() 
         WHERE user_id = $2
         RETURNING id, notification_preferences`,
        [JSON.stringify(preferences), userId]
    );
    return result.rows[0];
};

/**
 * Update privacy settings
 * @param {string} userId
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
const updatePrivacySettings = async (userId, settings) => {
    const result = await query(
        `UPDATE user_profiles 
         SET privacy_settings = $1, updated_at = NOW() 
         WHERE user_id = $2
         RETURNING id, privacy_settings`,
        [JSON.stringify(settings), userId]
    );
    return result.rows[0];
};

/**
 * Increment rounds played
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const incrementRoundsPlayed = async (userId) => {
    const result = await query(
        `UPDATE user_profiles 
         SET rounds_played = rounds_played + 1, updated_at = NOW() 
         WHERE user_id = $1
         RETURNING rounds_played`,
        [userId]
    );
    return result.rows[0];
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

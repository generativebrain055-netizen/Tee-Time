const { pool } = require("../config/database");

class FriendRepository {
    // ============ FRIEND REQUESTS ============

    // Send friend request
    async sendFriendRequest(senderId, receiverId, message = null) {
        // First check if there's an existing friendship (shouldn't happen but just in case)
        const friendshipCheck = await pool.query(
            "SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2",
            [senderId, receiverId]
        );
        if (friendshipCheck.rows.length > 0) {
            throw new Error('Already friends with this user');
        }

        // Allow re-sending friend request even if previously declined/accepted
        const query = `
            INSERT INTO friend_requests (sender_id, receiver_id, message, status)
            VALUES ($1, $2, $3, 'pending')
            ON CONFLICT (sender_id, receiver_id) DO UPDATE SET
                status = 'pending',
                message = EXCLUDED.message,
                updated_at = NOW()
            RETURNING *
        `;
        const result = await pool.query(query, [senderId, receiverId, message]);
        return result.rows[0];
    }

    // Get pending requests received
    async getPendingRequests(userId) {
        const query = `
            SELECT fr.*, 
                   u.first_name, u.last_name, u.username,
                   p.handicap, p.avatar_url, p.location, p.home_course
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE fr.receiver_id = $1 AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Get sent requests
    async getSentRequests(userId) {
        const query = `
            SELECT fr.*, 
                   u.first_name, u.last_name, u.username,
                   p.handicap, p.avatar_url, p.location
            FROM friend_requests fr
            JOIN users u ON fr.receiver_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE fr.sender_id = $1 AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Respond to friend request
    async respondToRequest(requestId, receiverId, status) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update request status
            const updateQuery = `
                UPDATE friend_requests 
                SET status = $1, responded_at = NOW(), updated_at = NOW()
                WHERE id = $2 AND receiver_id = $3 AND status = 'pending'
                RETURNING *
            `;
            const result = await client.query(updateQuery, [status, requestId, receiverId]);
            const request = result.rows[0];

            if (!request) {
                throw new Error('Request not found or already responded');
            }

            // If accepted, create friendship (bidirectional)
            if (status === 'accepted') {
                await client.query(
                    `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)
                     ON CONFLICT DO NOTHING`,
                    [request.sender_id, request.receiver_id]
                );
            }

            await client.query('COMMIT');
            return request;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Check if friend request exists
    async getRequestStatus(userId, otherUserId) {
        const query = `
            SELECT * FROM friend_requests 
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at DESC LIMIT 1
        `;
        const result = await pool.query(query, [userId, otherUserId]);
        return result.rows[0];
    }

    // ============ FRIENDSHIPS ============

    // Get user's friends
    async getFriends(userId) {
        const query = `
            SELECT f.id as friendship_id, f.created_at as friends_since,
                   u.id, u.first_name, u.last_name, u.username,
                   p.handicap, p.avatar_url, p.location, p.home_course,
                   p.preferred_tee_time, p.walk_or_ride, p.rounds_played, p.social_rate
            FROM friendships f
            JOIN users u ON f.friend_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE f.user_id = $1 AND u.deleted_at IS NULL
            ORDER BY u.first_name, u.last_name
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Check if users are friends
    async areFriends(userId1, userId2) {
        const query = `
            SELECT EXISTS(
                SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2
            ) as are_friends
        `;
        const result = await pool.query(query, [userId1, userId2]);
        return result.rows[0].are_friends;
    }

    // Remove friend
    async removeFriend(userId, friendId) {
        const query = `
            DELETE FROM friendships 
            WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
            RETURNING *
        `;
        const result = await pool.query(query, [userId, friendId]);
        return result.rows.length > 0;
    }

    // ============ DISCOVER USERS ============

    // Get users by location/course (for Availability screen)
    async discoverUsers(userId, options = {}) {
        const { location, course, limit = 20, offset = 0 } = options;
        
        let whereClause = 'u.id != $1 AND u.deleted_at IS NULL';
        const params = [userId];
        let paramIndex = 2;

        if (location) {
            whereClause += " AND p.location ILIKE $" + paramIndex;
            params.push("%" + location + "%");
            paramIndex++;
        }

        if (course) {
            whereClause += " AND p.home_course ILIKE $" + paramIndex;
            params.push("%" + course + "%");
            paramIndex++;
        }

        params.push(limit, offset);

        // Note: Only check for PENDING friend requests, not accepted/declined ones
        // This allows re-adding friends after unfriending
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.username,
                   p.handicap, p.avatar_url, p.location, p.home_course,
                   p.preferred_tee_time, p.walk_or_ride, p.social_rate,
                   CASE 
                       WHEN f.id IS NOT NULL THEN 'friend'
                       WHEN fr_sent.id IS NOT NULL AND fr_sent.status = 'pending' THEN 'requested'
                       WHEN fr_recv.id IS NOT NULL AND fr_recv.status = 'pending' THEN 'pending'
                       ELSE 'none'
                   END as friendship_status
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN friendships f ON f.user_id = $1 AND f.friend_id = u.id
            LEFT JOIN friend_requests fr_sent ON fr_sent.sender_id = $1 AND fr_sent.receiver_id = u.id AND fr_sent.status = 'pending'
            LEFT JOIN friend_requests fr_recv ON fr_recv.receiver_id = $1 AND fr_recv.sender_id = u.id AND fr_recv.status = 'pending'
            WHERE ` + whereClause + `
            ORDER BY p.social_rate DESC NULLS LAST, u.first_name
            LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1);

        const result = await pool.query(query, params);
        return result.rows;
    }

    // Get user profile for friend view
    async getUserProfile(userId, viewerId) {
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.username,
                   p.handicap, p.avatar_url, p.location, p.home_course,
                   p.preferred_tee_time, p.walk_or_ride, p.playing_partner_preference,
                   p.rounds_played, p.social_rate, p.average_score,
                   p.privacy_settings,
                   CASE 
                       WHEN f.id IS NOT NULL THEN 'friend'
                       WHEN fr_sent.id IS NOT NULL AND fr_sent.status = 'pending' THEN 'requested'
                       WHEN fr_recv.id IS NOT NULL AND fr_recv.status = 'pending' THEN 'pending'
                       ELSE 'none'
                   END as friendship_status
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN friendships f ON f.user_id = $2 AND f.friend_id = u.id
            LEFT JOIN friend_requests fr_sent ON fr_sent.sender_id = $2 AND fr_sent.receiver_id = u.id AND fr_sent.status = 'pending'
            LEFT JOIN friend_requests fr_recv ON fr_recv.receiver_id = $2 AND fr_recv.sender_id = u.id AND fr_recv.status = 'pending'
            WHERE u.id = $1 AND u.deleted_at IS NULL
        `;
        const result = await pool.query(query, [userId, viewerId]);
        return result.rows[0];
    }

    // ============ BLOCK USERS ============

    // Block a user
    async blockUser(userId, blockedUserId) {
        const query = `
            INSERT INTO blocked_users (user_id, blocked_user_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, blocked_user_id) DO NOTHING
            RETURNING *
        `;
        const result = await pool.query(query, [userId, blockedUserId]);
        return result.rows[0];
    }

    // Unblock a user
    async unblockUser(userId, blockedUserId) {
        const query = `
            DELETE FROM blocked_users 
            WHERE user_id = $1 AND blocked_user_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [userId, blockedUserId]);
        return result.rows[0];
    }

    // Get blocked users
    async getBlockedUsers(userId) {
        const query = `
            SELECT bu.*, u.first_name, u.last_name, u.username, p.avatar_url
            FROM blocked_users bu
            JOIN users u ON bu.blocked_user_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE bu.user_id = $1
            ORDER BY bu.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Check if user is blocked
    async isBlocked(userId, otherUserId) {
        const query = `
            SELECT EXISTS(
                SELECT 1 FROM blocked_users 
                WHERE (user_id = $1 AND blocked_user_id = $2)
                   OR (user_id = $2 AND blocked_user_id = $1)
            ) as is_blocked
        `;
        const result = await pool.query(query, [userId, otherUserId]);
        return result.rows[0].is_blocked;
    }
}

module.exports = new FriendRepository();

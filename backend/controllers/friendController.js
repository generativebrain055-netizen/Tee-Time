const friendRepository = require("../repositories/friendRepository");
const notificationService = require("../services/notificationService");
const logger = require("../config/logger");

class FriendController {
    constructor() {
        // Bind all methods to preserve 'this' context
        this.sendFriendRequest = this.sendFriendRequest.bind(this);
        this.getPendingRequests = this.getPendingRequests.bind(this);
        this.getSentRequests = this.getSentRequests.bind(this);
        this.respondToRequest = this.respondToRequest.bind(this);
        this.getFriends = this.getFriends.bind(this);
        this.removeFriend = this.removeFriend.bind(this);
        this.discoverUsers = this.discoverUsers.bind(this);
        this.getUserProfile = this.getUserProfile.bind(this);
        this.blockUser = this.blockUser.bind(this);
        this.unblockUser = this.unblockUser.bind(this);
        this.getBlockedUsers = this.getBlockedUsers.bind(this);
    }

    // POST /api/friends/request
    async sendFriendRequest(req, res) {
        try {
            const senderId = req.user.id;
            const { receiverId, message } = req.body;

            if (senderId === receiverId) {
                return res.status(400).json({ success: false, message: "Cannot send friend request to yourself" });
            }

            // Check if either user has blocked the other
            const isBlocked = await friendRepository.isBlocked(senderId, receiverId);
            if (isBlocked) {
                return res.status(403).json({ success: false, message: "Unable to send friend request" });
            }

            // Check if already friends
            const areFriends = await friendRepository.areFriends(senderId, receiverId);
            if (areFriends) {
                return res.status(400).json({ success: false, message: "Already friends" });
            }

            // Check existing request
            const existing = await friendRepository.getRequestStatus(senderId, receiverId);
            if (existing && existing.status === 'pending') {
                return res.status(400).json({ success: false, message: "Friend request already pending" });
            }

            const request = await friendRepository.sendFriendRequest(senderId, receiverId, message);
            
            // Create notification for receiver with requestId for Add Back functionality
            await notificationService.notifyFriendRequest(receiverId, {
                id: senderId,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                avatar: req.user.avatar,
            }, request.id);
            
            res.status(201).json({ success: true, request });
        } catch (error) {
            logger.error("Send friend request error:", error);
            res.status(500).json({ success: false, message: "Failed to send friend request" });
        }
    }

    // GET /api/friends/requests/pending
    async getPendingRequests(req, res) {
        try {
            const userId = req.user.id;
            const requests = await friendRepository.getPendingRequests(userId);

            const formatted = requests.map(r => ({
                id: r.id,
                message: r.message,
                createdAt: r.created_at,
                sender: {
                    id: r.sender_id,
                    firstName: r.first_name,
                    lastName: r.last_name,
                    username: r.username,
                    handicap: r.handicap,
                    avatar: r.avatar_url,
                    location: r.location,
                    homeCourse: r.home_course
                }
            }));

            res.json({ success: true, requests: formatted });
        } catch (error) {
            logger.error("Get pending requests error:", error);
            res.status(500).json({ success: false, message: "Failed to get pending requests" });
        }
    }

    // GET /api/friends/requests/sent
    async getSentRequests(req, res) {
        try {
            const userId = req.user.id;
            const requests = await friendRepository.getSentRequests(userId);

            const formatted = requests.map(r => ({
                id: r.id,
                createdAt: r.created_at,
                receiver: {
                    id: r.receiver_id,
                    firstName: r.first_name,
                    lastName: r.last_name,
                    username: r.username,
                    handicap: r.handicap,
                    avatar: r.avatar_url,
                    location: r.location
                }
            }));

            res.json({ success: true, requests: formatted });
        } catch (error) {
            logger.error("Get sent requests error:", error);
            res.status(500).json({ success: false, message: "Failed to get sent requests" });
        }
    }

    // PUT /api/friends/requests/:id/respond
    async respondToRequest(req, res) {
        try {
            const userId = req.user.id;
            const requestId = req.params.id;
            const { response } = req.body; // 'accepted' or 'declined'

            if (!['accepted', 'declined'].includes(response)) {
                return res.status(400).json({ success: false, message: "Invalid response" });
            }

            const request = await friendRepository.respondToRequest(requestId, userId, response);
            
            // If accepted, notify the original sender
            if (response === 'accepted' && request.sender_id) {
                await notificationService.notifyFriendRequestAccepted(request.sender_id, {
                    id: userId,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                    avatar: req.user.avatar,
                });
            }
            
            res.json({ 
                success: true, 
                message: response === 'accepted' ? 'Friend request accepted!' : 'Friend request declined',
                request 
            });
        } catch (error) {
            logger.error("Respond to request error:", error);
            res.status(500).json({ success: false, message: error.message || "Failed to respond" });
        }
    }

    // GET /api/friends
    async getFriends(req, res) {
        try {
            const userId = req.user.id;
            const friends = await friendRepository.getFriends(userId);

            const formatted = friends.map(f => ({
                id: f.id,
                firstName: f.first_name,
                lastName: f.last_name,
                username: f.username,
                handicap: f.handicap,
                avatar: f.avatar_url,
                location: f.location,
                homeCourse: f.home_course,
                preferredTeeTime: f.preferred_tee_time,
                walkOrRide: f.walk_or_ride,
                roundsPlayed: f.rounds_played,
                socialRate: f.social_rate,
                friendsSince: f.friends_since
            }));

            res.json({ success: true, friends: formatted });
        } catch (error) {
            logger.error("Get friends error:", error);
            res.status(500).json({ success: false, message: "Failed to get friends" });
        }
    }

    // DELETE /api/friends/:id
    async removeFriend(req, res) {
        try {
            const userId = req.user.id;
            const friendId = req.params.id;

            const removed = await friendRepository.removeFriend(userId, friendId);
            if (!removed) {
                return res.status(404).json({ success: false, message: "Friendship not found" });
            }

            res.json({ success: true, message: "Friend removed" });
        } catch (error) {
            logger.error("Remove friend error:", error);
            res.status(500).json({ success: false, message: "Failed to remove friend" });
        }
    }

    // GET /api/friends/discover
    async discoverUsers(req, res) {
        try {
            const userId = req.user.id;
            const { location, course, limit, offset } = req.query;

            const users = await friendRepository.discoverUsers(userId, {
                location,
                course,
                limit: parseInt(limit) || 20,
                offset: parseInt(offset) || 0
            });

            const formatted = users.map(u => ({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                username: u.username,
                handicap: u.handicap,
                avatar: u.avatar_url,
                location: u.location,
                homeCourse: u.home_course,
                preferredTeeTime: u.preferred_tee_time,
                walkOrRide: u.walk_or_ride,
                socialRate: u.social_rate,
                friendshipStatus: u.friendship_status
            }));

            res.json({ success: true, users: formatted });
        } catch (error) {
            logger.error("Discover users error:", error);
            res.status(500).json({ success: false, message: "Failed to discover users" });
        }
    }

    // GET /api/friends/profile/:id
    async getUserProfile(req, res) {
        try {
            const viewerId = req.user.id;
            const userId = req.params.id;

            const profile = await friendRepository.getUserProfile(userId, viewerId);
            if (!profile) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Apply privacy settings
            const privacy = profile.privacy_settings || {};
            const formatted = {
                id: profile.id,
                firstName: profile.first_name,
                lastName: profile.last_name,
                username: profile.username,
                avatar: profile.avatar_url,
                handicap: privacy.show_handicap !== false ? profile.handicap : null,
                location: privacy.show_location !== false ? profile.location : null,
                homeCourse: profile.home_course,
                preferredTeeTime: profile.preferred_tee_time,
                walkOrRide: profile.walk_or_ride,
                playingPartnerPreference: profile.playing_partner_preference,
                roundsPlayed: profile.rounds_played,
                socialRate: profile.social_rate,
                averageScore: profile.average_score,
                friendshipStatus: profile.friendship_status,
                // Include additional fields from enhanced getUserProfile
                roundsCount: profile.roundsCount || profile.rounds_played || 0,
                coursesCount: profile.coursesCount || 0,
                recentRounds: profile.recentRounds || [],
                golfVibe: profile.golfVibe || profile.playing_partner_preference,
                drinkOfChoice: profile.drinkOfChoice || profile.drink_of_choice,
                clubs: profile.clubs || []
            };

            res.json({ success: true, profile: formatted });
        } catch (error) {
            logger.error("Get user profile error:", error);
            res.status(500).json({ success: false, message: "Failed to get profile" });
        }
    }

    // POST /api/friends/block/:id
    async blockUser(req, res) {
        try {
            const userId = req.user.id;
            const blockedUserId = req.params.id;

            if (userId === blockedUserId) {
                return res.status(400).json({ success: false, message: "Cannot block yourself" });
            }

            // Remove friendship if exists
            await friendRepository.removeFriend(userId, blockedUserId);

            // Add to blocked list
            await friendRepository.blockUser(userId, blockedUserId);

            logger.info(`User ${userId} blocked user ${blockedUserId}`);
            res.json({ success: true, message: "User blocked successfully" });
        } catch (error) {
            logger.error("Block user error:", error);
            res.status(500).json({ success: false, message: "Failed to block user" });
        }
    }

    // DELETE /api/friends/block/:id
    async unblockUser(req, res) {
        try {
            const userId = req.user.id;
            const blockedUserId = req.params.id;

            await friendRepository.unblockUser(userId, blockedUserId);

            logger.info(`User ${userId} unblocked user ${blockedUserId}`);
            res.json({ success: true, message: "User unblocked successfully" });
        } catch (error) {
            logger.error("Unblock user error:", error);
            res.status(500).json({ success: false, message: "Failed to unblock user" });
        }
    }

    // GET /api/friends/blocked
    async getBlockedUsers(req, res) {
        try {
            const userId = req.user.id;
            const blockedUsers = await friendRepository.getBlockedUsers(userId);

            const formatted = blockedUsers.map(u => ({
                id: u.blocked_user_id,
                firstName: u.first_name,
                lastName: u.last_name,
                username: u.username,
                avatar: u.avatar_url,
                blockedAt: u.created_at
            }));

            res.json({ success: true, blockedUsers: formatted });
        } catch (error) {
            logger.error("Get blocked users error:", error);
            res.status(500).json({ success: false, message: "Failed to get blocked users" });
        }
    }
}

module.exports = new FriendController();

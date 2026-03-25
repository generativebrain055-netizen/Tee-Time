const { supabaseAdmin, handleError } = require("../config/supabase");
const rosterRepository = require("./rosterRepository");

class FriendRepository {
  // Send friend request
  async sendFriendRequest(senderId, receiverId, message = null) {
    try {
      // Check if already friends
      const { data: existingFriendship } = await supabaseAdmin
        .from("friendships")
        .select("id")
        .eq("user_id", senderId)
        .eq("friend_id", receiverId)
        .single();

      if (existingFriendship) {
        throw new Error("Already friends with this user");
      }

      const { data, error } = await supabaseAdmin
        .from("friend_requests")
        .upsert(
          {
            sender_id: senderId,
            receiver_id: receiverId,
            message,
            status: "pending",
          },
          {
            onConflict: "sender_id,receiver_id",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "sendFriendRequest");
    }
  }

      // Get pending requests received
  async getPendingRequests(userId) {
    try {
      const logger = require("../config/logger");
      
      const { data, error } = await supabaseAdmin
        .from("friend_requests")
        .select(
          `
                    *,
                    users!friend_requests_sender_id_fkey (
                        first_name, 
                        last_name, 
                        username,
                        user_profiles (
                            handicap, avatar_url, location, home_course
                        )
                    )
                `
        )
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching pending friend requests", {
          userId,
          error,
        });
        throw error;
      }

      logger.debug("Fetched pending friend requests", {
        userId,
        count: (data || []).length,
        requestIds: (data || []).map(r => r.id),
      });

      if (error) throw error;

      return (data || []).map((fr) => {
        const user = fr.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete user.user_profiles;
        delete fr.users;

        // Preserve friend_requests.id so accept/decline always use request id, not sender id
        return { ...fr, ...user, ...profile, id: fr.id };
      });
    } catch (error) {
      handleError(error, "getPendingRequests");
    }
  }

  // Get sent requests
  async getSentRequests(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("friend_requests")
        .select(
          `
                    *,
                    users!friend_requests_receiver_id_fkey (
                        first_name, 
                        last_name, 
                        username,
                        user_profiles (
                            handicap, avatar_url, location
                        )
                    )
                `
        )
        .eq("sender_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((fr) => {
        const user = fr.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete user.user_profiles;
        delete fr.users;

        return { ...fr, ...user, ...profile, id: fr.id };
      });
    } catch (error) {
      handleError(error, "getSentRequests");
    }
  }

  // Respond to friend request - COMPLEX: needs transaction
  async respondToRequest(requestId, receiverId, status) {
    try {
      const logger = require("../config/logger");
      
      logger.info("Responding to friend request", {
        requestId,
        receiverId,
        status,
      });

      // Update request status
      const { data: request, error: updateError } = await supabaseAdmin
        .from("friend_requests")
        .update({
          status,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("receiver_id", receiverId)
        .eq("status", "pending")
        .select()
        .single();

      if (updateError) {
        logger.error("Error updating friend request status", {
          requestId,
          receiverId,
          status,
          error: updateError,
        });
        throw updateError;
      }
      
      if (!request) {
        logger.warn("Friend request not found or already responded", {
          requestId,
          receiverId,
          status,
        });
        throw new Error("Request not found or already responded");
      }

      logger.info("Friend request status updated successfully", {
        requestId,
        receiverId,
        status,
        senderId: request.sender_id,
      });

      // If accepted, create bidirectional friendship and add to roster
      if (status === "accepted") {
        const { error: friendshipError } = await supabaseAdmin
          .from("friendships")
          .insert([
            { user_id: request.sender_id, friend_id: request.receiver_id },
            { user_id: request.receiver_id, friend_id: request.sender_id },
          ]);

        if (friendshipError && friendshipError.code !== "23505")
          throw friendshipError;

        // Add each user to the other's roster if not already present
        try {
          // Check if sender is already in receiver's roster
          const { data: receiverRosterEntry } = await supabaseAdmin
            .from("roster")
            .select("id")
            .eq("user_id", request.receiver_id)
            .eq("contact_user_id", request.sender_id)
            .maybeSingle();

          if (!receiverRosterEntry) {
            await rosterRepository.addToRoster(request.receiver_id, {
              contactUserId: request.sender_id,
            });
          }

          // Check if receiver is already in sender's roster
          const { data: senderRosterEntry } = await supabaseAdmin
            .from("roster")
            .select("id")
            .eq("user_id", request.sender_id)
            .eq("contact_user_id", request.receiver_id)
            .maybeSingle();

          if (!senderRosterEntry) {
            await rosterRepository.addToRoster(request.sender_id, {
              contactUserId: request.receiver_id,
            });
          }
        } catch (rosterError) {
          // Log but don't fail the friend request acceptance if roster add fails
          // (e.g., duplicate key or other non-critical error)
          const logger = require("../config/logger");
          logger.warn("Failed to add friend to roster after accepting request", {
            requestId,
            senderId: request.sender_id,
            receiverId: request.receiver_id,
            error: rosterError?.message,
          });
        }
      }

      return request;
    } catch (error) {
      handleError(error, "respondToRequest");
    }
  }

  // Check if friend request exists
  async getRequestStatus(userId, otherUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("friend_requests")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "getRequestStatus");
    }
  }

  // Get user's friends
  async getFriends(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("friendships")
        .select(
          `
                    id,
                    created_at,
                    users!friendships_friend_id_fkey (
                        id, first_name, last_name, username,
                        user_profiles (
                            handicap, avatar_url, location, home_course,
                            preferred_tee_time, walk_or_ride, rounds_played, 
                            social_rate, average_score, bio, clubs,
                            driver, irons, putter, ball, playing_partner_preference,
                            drink_of_choice
                        )
                    )
                `
        )
        .eq("user_id", userId)
        .order("users(first_name)", { ascending: true });

      if (error) throw error;

      return (data || []).map((f) => {
        const user = f.users || {};
        const profileData = user.user_profiles;
        
        // Handle profile data - Supabase can return it as array or object
        let profile = {};
        if (profileData) {
          if (Array.isArray(profileData)) {
            profile = profileData[0] || {};
          } else {
            profile = profileData;
          }
        }

        // Ensure all profile fields are included, even if null
        return {
          friendship_id: f.id,
          friends_since: f.created_at,
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          // Profile fields - explicitly include all fields
          handicap: profile.handicap || null,
          avatar_url: profile.avatar_url || null,
          location: profile.location || null,
          home_course: profile.home_course || null,
          preferred_tee_time: profile.preferred_tee_time || null,
          walk_or_ride: profile.walk_or_ride || null,
          rounds_played: profile.rounds_played || null,
          social_rate: profile.social_rate || null,
          average_score: profile.average_score || null,
          bio: profile.bio || null,
          clubs: profile.clubs || null,
          driver: profile.driver || null,
          irons: profile.irons || null,
          putter: profile.putter || null,
          ball: profile.ball || null,
          playing_partner_preference: profile.playing_partner_preference || null,
          drink_of_choice: profile.drink_of_choice || null,
        };
      });
    } catch (error) {
      handleError(error, "getFriends");
    }
  }

  // Check if users are friends
  async areFriends(userId1, userId2) {
    try {
      const { data, error } = await supabaseAdmin
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId1)
        .eq("friend_id", userId2);

      if (error) throw error;
      return data !== null;
    } catch (error) {
      handleError(error, "areFriends");
    }
  }

  // Remove friend - COMPLEX: needs transaction
  async removeFriend(userId, friendId) {
    try {
      // Delete friendship (both directions)
      const { error: friendshipError } = await supabaseAdmin
        .from("friendships")
        .delete()
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        );

      if (friendshipError) throw friendshipError;

      // Remove from both users' rosters
      await supabaseAdmin
        .from("roster")
        .delete()
        .eq("user_id", userId)
        .eq("contact_user_id", friendId);

      await supabaseAdmin
        .from("roster")
        .delete()
        .eq("user_id", friendId)
        .eq("contact_user_id", userId);

      return true;
    } catch (error) {
      handleError(error, "removeFriend");
    }
  }

  // Discover users
  async discoverUsers(userId, options = {}) {
    const { location, course, limit = 20, offset = 0 } = options;

    try {
      let query = supabaseAdmin
        .from("users")
        .select(
          `
                    id, first_name, last_name, username,
                    user_profiles (
                        handicap, avatar_url, location, home_course,
                        preferred_tee_time, walk_or_ride, social_rate
                    )
                `
        )
        .neq("id", userId)
        .is("deleted_at", null);

      if (location) {
        query = query.ilike("user_profiles.location", `%${location}%`);
      }

      if (course) {
        query = query.ilike("user_profiles.home_course", `%${course}%`);
      }

      query = query
        .order("user_profiles(social_rate)", {
          ascending: false,
          nullsFirst: false,
        })
        .order("first_name", { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      // Get friendship status for each user
      const usersWithStatus = await Promise.all(
        (data || []).map(async (user) => {
          const profile = user.user_profiles?.[0] || {};
          delete user.user_profiles;

          // Check friendship
          const { data: friendship } = await supabaseAdmin
            .from("friendships")
            .select("id")
            .eq("user_id", userId)
            .eq("friend_id", user.id)
            .single();

          // Check sent request
          const { data: sentRequest } = await supabaseAdmin
            .from("friend_requests")
            .select("id, status")
            .eq("sender_id", userId)
            .eq("receiver_id", user.id)
            .eq("status", "pending")
            .single();

          // Check received request
          const { data: receivedRequest } = await supabaseAdmin
            .from("friend_requests")
            .select("id, status")
            .eq("sender_id", user.id)
            .eq("receiver_id", userId)
            .eq("status", "pending")
            .single();

          let friendship_status = "none";
          if (friendship) friendship_status = "friend";
          else if (sentRequest) friendship_status = "requested";
          else if (receivedRequest) friendship_status = "pending";

          return { ...user, ...profile, friendship_status };
        })
      );

      return usersWithStatus;
    } catch (error) {
      handleError(error, "discoverUsers");
    }
  }

  // Get user profile for friend view
  async getUserProfile(userId, viewerId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select(
          `
                    id, first_name, last_name, username,
                    user_profiles (
                        handicap, avatar_url, location, home_course,
                        preferred_tee_time, walk_or_ride, playing_partner_preference,
                        rounds_played, social_rate, average_score, privacy_settings,
                        drink_of_choice, clubs
                    )
                `
        )
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      const profile = data.user_profiles?.[0] || {};
      delete data.user_profiles;

      // Get friendship status
      const { data: friendship } = await supabaseAdmin
        .from("friendships")
        .select("id")
        .eq("user_id", viewerId)
        .eq("friend_id", userId)
        .single();

      const { data: sentRequest } = await supabaseAdmin
        .from("friend_requests")
        .select("id")
        .eq("sender_id", viewerId)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .single();

      const { data: receivedRequest } = await supabaseAdmin
        .from("friend_requests")
        .select("id")
        .eq("sender_id", userId)
        .eq("receiver_id", viewerId)
        .eq("status", "pending")
        .single();

      let friendship_status = "none";
      if (friendship) friendship_status = "friend";
      else if (sentRequest) friendship_status = "requested";
      else if (receivedRequest) friendship_status = "pending";

      // Get completed tee-time aggregates for unified stats logic:
      // - roundsCount: total completed rounds
      // - coursesCount: unique completed courses
      // - recentRounds: latest 3 completed rounds
      let recentRounds = [];
      let uniqueCourses = new Set();
      let completedRoundsCount = 0;
      
      try {
        // Get completed tee times where user is a participant.
        // Note: Ordering by foreign table columns may not work directly, so we'll sort in JS.
        const { data: allCompleted, error: allCompletedError } = await supabaseAdmin
          .from("tee_time_participants")
          .select(
            `
            tee_times!inner (
              id,
              course_name,
              tee_date,
              tee_time,
              status
            )
          `
          )
          .eq("user_id", userId)
          .eq("tee_times.status", "completed");

        if (!allCompletedError && allCompleted && allCompleted.length > 0) {
          completedRoundsCount = allCompleted.length;

          // Extract, normalize, and sort tee times by date (most recent first)
          const teeTimes = allCompleted
            .map((p) => {
              const tt = Array.isArray(p.tee_times) ? p.tee_times[0] : p.tee_times;
              return tt;
            })
            .filter(Boolean)
            .sort((a, b) => {
              // Sort by date descending (most recent first)
              const dateCompare = (b.tee_date || "").localeCompare(a.tee_date || "");
              if (dateCompare !== 0) return dateCompare;
              // If same date, sort by time descending
              return (b.tee_time || "").localeCompare(a.tee_time || "");
            })
            .slice(0, 3); // Take top 3

          recentRounds = teeTimes.map((round) => ({
            courseName: round.course_name,
            date: round.tee_date,
          }));

          // Compute unique courses from all completed tee times
          allCompleted.forEach((p) => {
            const tt = Array.isArray(p.tee_times) ? p.tee_times[0] : p.tee_times;
            if (tt?.course_name) uniqueCourses.add(tt.course_name);
          });
        }
      } catch (roundsError) {
        // Continue without recent rounds data - not critical
        // Log error for debugging but don't fail the entire request
        const logger = require("../config/logger");
        logger.warn(`Failed to fetch recent rounds for user ${userId}:`, roundsError);
      }

      return {
        ...data,
        ...profile,
        friendship_status,
        roundsCount: profile.rounds_played ?? completedRoundsCount,
        coursesCount: uniqueCourses.size,
        recentRounds: recentRounds,
        golfVibe: profile.playing_partner_preference,
        drinkOfChoice: profile.drink_of_choice,
      };
    } catch (error) {
      handleError(error, "getUserProfile");
    }
  }

  // Block a user
  async blockUser(userId, blockedUserId) {
    try {
      await supabaseAdmin.from("blocked_users").upsert(
        {
          user_id: userId,
          blocked_user_id: blockedUserId,
        },
        {
          onConflict: "user_id,blocked_user_id",
          ignoreDuplicates: true,
        }
      );

      // Remove from both rosters
      await supabaseAdmin
        .from("roster")
        .delete()
        .eq("user_id", userId)
        .eq("contact_user_id", blockedUserId);

      await supabaseAdmin
        .from("roster")
        .delete()
        .eq("user_id", blockedUserId)
        .eq("contact_user_id", userId);

      return { user_id: userId, blocked_user_id: blockedUserId };
    } catch (error) {
      handleError(error, "blockUser");
    }
  }

  // Unblock a user
  async unblockUser(userId, blockedUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("blocked_users")
        .delete()
        .eq("user_id", userId)
        .eq("blocked_user_id", blockedUserId)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "unblockUser");
    }
  }

  // Get blocked users
  async getBlockedUsers(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("blocked_users")
        .select(
          `
                    *,
                    users!blocked_users_blocked_user_id_fkey (
                        first_name, 
                        last_name, 
                        username,
                        user_profiles (avatar_url)
                    )
                `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((bu) => {
        const user = bu.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete user.user_profiles;
        delete bu.users;

        return { ...bu, ...user, ...profile };
      });
    } catch (error) {
      handleError(error, "getBlockedUsers");
    }
  }

  // Check if either user has blocked the other (blocks messaging in both directions)
  async isBlocked(userId, otherUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("blocked_users")
        .select("id")
        .or(
          `and(user_id.eq.${userId},blocked_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},blocked_user_id.eq.${userId})`
        )
        .limit(1);

      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      handleError(error, "isBlocked");
    }
  }
}

module.exports = new FriendRepository();

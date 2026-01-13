const { supabaseAdmin, handleError } = require("../config/supabase");

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

      if (error) throw error;

      return (data || []).map((fr) => {
        const user = fr.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete user.user_profiles;
        delete fr.users;

        return { ...fr, ...user, ...profile };
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

        return { ...fr, ...user, ...profile };
      });
    } catch (error) {
      handleError(error, "getSentRequests");
    }
  }

  // Respond to friend request - COMPLEX: needs transaction
  async respondToRequest(requestId, receiverId, status) {
    try {
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

      if (updateError) throw updateError;
      if (!request) throw new Error("Request not found or already responded");

      // If accepted, create bidirectional friendship
      if (status === "accepted") {
        const { error: friendshipError } = await supabaseAdmin
          .from("friendships")
          .insert([
            { user_id: request.sender_id, friend_id: request.receiver_id },
            { user_id: request.receiver_id, friend_id: request.sender_id },
          ]);

        if (friendshipError && friendshipError.code !== "23505")
          throw friendshipError;
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
                            preferred_tee_time, walk_or_ride, rounds_played, social_rate
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
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete user.user_profiles;

        return {
          friendship_id: f.id,
          friends_since: f.created_at,
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          ...profile,
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
                        rounds_played, social_rate, average_score, privacy_settings
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

      return { ...data, ...profile, friendship_status };
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

  // Check if user is blocked
  async isBlocked(userId, otherUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("blocked_users")
        .select("id", { count: "exact", head: true })
        .or(
          `and(user_id.eq.${userId},blocked_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},blocked_user_id.eq.${userId})`
        );

      if (error) throw error;
      return data !== null;
    } catch (error) {
      handleError(error, "isBlocked");
    }
  }
}

module.exports = new FriendRepository();

const { supabaseAdmin, handleError } = require("../config/supabase");
const logger = require("../config/logger");

class RosterRepository {
  async getRoster(userId, options = {}) {
    const { groupId, sortBy = "position", isOnDeck } = options;

    try {
      let query = supabaseAdmin
        .from("roster")
        .select(
          `
          *,
          users!roster_contact_user_id_fkey (
            first_name, 
            last_name, 
            username,
            user_profiles (
              avatar_url, handicap, social_rate, location, home_course, preferred_tee_time, walk_or_ride, rounds_played, average_score
            )
          ),
          roster_groups (name, color)
        `
        )
        .eq("user_id", userId);

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      if (isOnDeck !== undefined) {
        query = query.eq("is_on_deck", isOnDeck);
      }

      // Apply sorting
      // Note: Sorting by nested foreign tables is tricky in Supabase/PostgREST.
      // We might need to sort in memory if the relation path is complex.
      // For now, removing complex sorts to avoid errors, or implementing in-memory sort.
      // Simple sorts on roster table columns are fine.

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((r) => {
        const user = r.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};
        const group = r.roster_groups || {};

        delete r.users;
        delete r.roster_groups;

        return {
          ...r,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
          profile_social_rate: profile.social_rate,
          location: profile.location,
          home_course: profile.home_course,
          preferred_tee_time: profile.preferred_tee_time,
          walk_or_ride: profile.walk_or_ride,
          rounds_played: profile.rounds_played,
          average_score: profile.average_score,
          group_name: group.name,
          group_color: group.color,
        };
      });
      // Perform in-memory sorting if needed for cross-table fields
      // .sort(...)
    } catch (error) {
      handleError(error, "getRoster");
    }
  }

  async getOnDeck(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select(
          `
          *,
          users!roster_contact_user_id_fkey (
            first_name, 
            last_name, 
            username,
            user_profiles (avatar_url, handicap, social_rate)
          )
        `
        )
        .eq("user_id", userId)
        .eq("is_on_deck", true)
        .order("position", { ascending: true });

      if (error) throw error;

      return (data || []).map((r) => {
        const user = r.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete r.users;

        return {
          ...r,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
          profile_social_rate: profile.social_rate,
        };
      });
    } catch (error) {
      handleError(error, "getOnDeck");
    }
  }

  async addToRoster(userId, contact) {
    const { contactUserId, contactPhone, contactName, contactEmail } = contact;

    try {
      // Get max position
      const { data: maxData, error: maxError } = await supabaseAdmin
        .from("roster")
        .select("position")
        .eq("user_id", userId)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      if (maxError && maxError.code !== "PGRST116") throw maxError;

      const position = (maxData?.position ?? -1) + 1;

      const { data, error } = await supabaseAdmin
        .from("roster")
        .insert({
          user_id: userId,
          contact_user_id: contactUserId,
          contact_phone: contactPhone,
          contact_name: contactName,
          contact_email: contactEmail,
          position,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "addToRoster");
    }
  }

  async removeFromRoster(userId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .delete()
        .eq("id", rosterId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "removeFromRoster");
    }
  }

  async reorderRoster(userId, orderedIds) {
    try {
      // Batch update positions
      const updates = orderedIds.map((id, index) =>
        supabaseAdmin
          .from("roster")
          .update({ position: index })
          .eq("id", id)
          .eq("user_id", userId)
      );

      await Promise.all(updates);
      return true;
    } catch (error) {
      handleError(error, "reorderRoster");
    }
  }

  async toggleOnDeck(userId, rosterId, isOnDeck) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .update({ is_on_deck: isOnDeck })
        .eq("id", rosterId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "toggleOnDeck");
    }
  }

  async getRosterEntry(userId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select(
          `
          *,
          users (first_name, last_name, username),
          user_profiles (avatar_url)
        `
        )
        .eq("id", rosterId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      const user = data.users || {};
      const profile = data.user_profiles?.[0] || {};
      delete data.users;
      delete data.user_profiles;

      return {
        ...data,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_url: profile.avatar_url,
      };
    } catch (error) {
      handleError(error, "getRosterEntry");
    }
  }

  async searchUsers(query, excludeUserId) {
    try {
      const searchPattern = `%${query}%`;
      const { data, error } = await supabaseAdmin
        .from("users")
        .select(
          "id, phone_number, first_name, last_name, username, avatar_url, handicap"
        )
        .neq("id", excludeUserId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .or(
          `phone_number.ilike.${searchPattern},username.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`
        )
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "searchUsers");
    }
  }

  async isInRoster(userId, contactUserId = null, contactPhone = null) {
    try {
      let query = supabaseAdmin
        .from("roster")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (contactUserId) {
        query = query.eq("contact_user_id", contactUserId);
      } else {
        query = query.eq("contact_phone", contactPhone);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data !== null;
    } catch (error) {
      handleError(error, "isInRoster");
    }
  }

  // ============ ROSTER GROUPS ============

  async getGroups(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster_groups")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count: memberCount } = await supabaseAdmin
            .from("roster")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          const { count: onDeckCount } = await supabaseAdmin
            .from("roster")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)
            .eq("is_on_deck", true);

          return {
            ...group,
            member_count: memberCount || 0,
            on_deck_count: onDeckCount || 0,
            is_owner: true,
          };
        })
      );

      return groupsWithCounts;
    } catch (error) {
      handleError(error, "getGroups");
    }
  }

  async createGroup(userId, data) {
    const { name, description, color, icon, autoInvite, maxMembers } = data;

    try {
      // Check for duplicate name
      const { data: existing } = await supabaseAdmin
        .from("roster_groups")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", name)
        .single();

      if (existing) {
        const error = new Error("You already have a roster with this name");
        error.code = "DUPLICATE_NAME";
        throw error;
      }

      // Get max position
      const { data: maxData } = await supabaseAdmin
        .from("roster_groups")
        .select("position")
        .eq("user_id", userId)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      const position = (maxData?.position ?? -1) + 1;

      const { data: group, error } = await supabaseAdmin
        .from("roster_groups")
        .insert({
          user_id: userId,
          name,
          description,
          color: color || "#5DB075",
          icon,
          position,
          auto_invite: autoInvite !== false,
          max_members: maxMembers || 20,
        })
        .select()
        .single();

      if (error) throw error;
      return group;
    } catch (error) {
      handleError(error, "createGroup");
    }
  }

  async updateGroup(userId, groupId, data) {
    const {
      name,
      description,
      color,
      icon,
      autoInvite,
      maxMembers,
      sortPreference,
    } = data;

    try {
      // Check for duplicate name if name is being changed
      if (name) {
        const { data: existing } = await supabaseAdmin
          .from("roster_groups")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", name)
          .neq("id", groupId)
          .single();

        if (existing) {
          const error = new Error("You already have a roster with this name");
          error.code = "DUPLICATE_NAME";
          throw error;
        }
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;
      if (autoInvite !== undefined) updates.auto_invite = autoInvite;
      if (maxMembers !== undefined) updates.max_members = maxMembers;
      if (sortPreference !== undefined)
        updates.sort_preference = sortPreference;

      const { data: group, error } = await supabaseAdmin
        .from("roster_groups")
        .update(updates)
        .eq("id", groupId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return group;
    } catch (error) {
      handleError(error, "updateGroup");
    }
  }

  async updateGroupSortPreference(userId, groupId, sortBy) {
    const validSorts = [
      "position",
      "socialRate",
      "handicap",
      "name",
      "distance",
      "membership",
    ];
    if (!validSorts.includes(sortBy)) {
      throw new Error("Invalid sort option");
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("roster_groups")
        .update({ sort_preference: sortBy })
        .eq("id", groupId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "updateGroupSortPreference");
    }
  }

  async getAutoInviteMembers(userId, groupId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select(
          `
          *,
          users (first_name, last_name, username, phone_number),
          user_profiles (avatar_url, handicap, social_rate)
        `
        )
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .eq("is_on_deck", false)
        .order("position", { ascending: true });

      if (error) throw error;

      return (data || []).map((r) => {
        const user = r.users || {};
        const profile = r.user_profiles?.[0] || {};
        delete r.users;
        delete r.user_profiles;

        return {
          ...r,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          phone_number: user.phone_number,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
          social_rate: profile.social_rate,
        };
      });
    } catch (error) {
      handleError(error, "getAutoInviteMembers");
    }
  }

  async deleteGroup(userId, groupId) {
    try {
      // Remove group_id from roster entries
      await supabaseAdmin
        .from("roster")
        .update({ group_id: null })
        .eq("group_id", groupId)
        .eq("user_id", userId);

      const { data, error } = await supabaseAdmin
        .from("roster_groups")
        .delete()
        .eq("id", groupId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "deleteGroup");
    }
  }

  async addMembersToGroup(userId, groupId, memberUserIds) {
    try {
      let addedCount = 0;

      for (const memberUserId of memberUserIds) {
        // Find the roster entry for this friend
        const { data: rosterEntry } = await supabaseAdmin
          .from("roster")
          .select("id")
          .eq("user_id", userId)
          .eq("contact_user_id", memberUserId)
          .single();

        if (rosterEntry) {
          // Update the roster entry to belong to this group
          await supabaseAdmin
            .from("roster")
            .update({ group_id: groupId })
            .eq("id", rosterEntry.id);
          addedCount++;
        } else {
          // Friend not in roster yet, add them
          const { data: maxData } = await supabaseAdmin
            .from("roster")
            .select("position")
            .eq("user_id", userId)
            .order("position", { ascending: false })
            .limit(1)
            .single();

          const position = (maxData?.position ?? -1) + 1;

          await supabaseAdmin.from("roster").insert({
            user_id: userId,
            contact_user_id: memberUserId,
            group_id: groupId,
            position,
          });
          addedCount++;
        }
      }

      return addedCount;
    } catch (error) {
      handleError(error, "addMembersToGroup");
    }
  }

  async getGroupMembers(userId, groupId) {
    return this.getRoster(userId, { groupId });
  }

  async getGroupWithAccess(userId, groupId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster_groups")
        .select("*")
        .eq("id", groupId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      return { ...data, is_owner: true };
    } catch (error) {
      handleError(error, "getGroupWithAccess");
    }
  }

  async getGroupMembersForGroup(groupId, sortBy = "position") {
    try {
      let query = supabaseAdmin
        .from("roster")
        .select(
          `
          *,
          users (first_name, last_name, username),
          user_profiles (avatar_url, handicap, social_rate, location, home_course, preferred_tee_time, walk_or_ride, rounds_played, average_score),
          roster_groups (name, color)
        `
        )
        .eq("group_id", groupId);

      switch (sortBy) {
        case "socialRate":
          query = query.order("user_profiles(social_rate)", {
            ascending: false,
            nullsFirst: false,
          });
          break;
        case "handicap":
          query = query.order("contact_handicap", {
            ascending: true,
            nullsFirst: false,
          });
          break;
        case "name":
          query = query.order("contact_name", { ascending: true });
          break;
        default:
          query = query.order("position", { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((r) => {
        const user = r.users || {};
        const profile = r.user_profiles?.[0] || {};
        const group = r.roster_groups || {};
        delete r.users;
        delete r.user_profiles;
        delete r.roster_groups;

        return {
          ...r,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
          profile_social_rate: profile.social_rate,
          location: profile.location,
          home_course: profile.home_course,
          preferred_tee_time: profile.preferred_tee_time,
          walk_or_ride: profile.walk_or_ride,
          rounds_played: profile.rounds_played,
          average_score: profile.average_score,
          group_name: group.name,
          group_color: group.color,
        };
      });
    } catch (error) {
      handleError(error, "getGroupMembersForGroup");
    }
  }

  async addToGroup(userId, rosterId, groupId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .update({ group_id: groupId })
        .eq("id", rosterId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "addToGroup");
    }
  }

  async removeFromGroup(userId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .update({ group_id: null })
        .eq("id", rosterId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "removeFromGroup");
    }
  }

  async moveMember(userId, rosterId, targetGroupId, isOnDeck, newPosition) {
    try {
      const updates = {
        group_id: targetGroupId,
        is_on_deck: isOnDeck,
        position: newPosition,
      };

      const { data, error } = await supabaseAdmin
        .from("roster")
        .update(updates)
        .eq("id", rosterId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      // Reorder other members if needed - manually since .raw() is not supported
      if (newPosition !== null) {
        // Fetch items that need shifting
        const { data: itemsToShift } = await supabaseAdmin
          .from("roster")
          .select("id, position")
          .eq("user_id", userId)
          .neq("id", rosterId)
          .gte("position", newPosition)
          .eq("is_on_deck", isOnDeck);

        if (itemsToShift && itemsToShift.length > 0) {
          // Update efficiently (in parallel)
          await Promise.all(
            itemsToShift.map((item) =>
              supabaseAdmin
                .from("roster")
                .update({ position: item.position + 1 })
                .eq("id", item.id)
            )
          );
        }
      }

      return data;
    } catch (error) {
      handleError(error, "moveMember");
    }
  }

  // ============ MEMBER HISTORY ============

  async getMemberHistory(userId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster_member_history")
        .select(
          `
          *,
          tee_times (course_name, tee_date, tee_time, status),
          roster!inner (user_id)
        `
        )
        .eq("roster.user_id", userId)
        .eq("roster_id", rosterId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((h) => {
        const teeTime = h.tee_times || {};
        delete h.tee_times;
        delete h.roster; // Clean up the embedded roster object
        return {
          ...h,
          course_name: teeTime.course_name,
          tee_date: teeTime.tee_date,
          tee_time: teeTime.tee_time,
          tee_time_status: teeTime.status,
        };
      });
    } catch (error) {
      handleError(error, "getMemberHistory");
    }
  }

  async recordHistory(rosterId, teeTimeId, inviteStatus, playedTogether) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster_member_history")
        .insert({
          roster_id: rosterId,
          tee_time_id: teeTimeId,
          invite_status: inviteStatus,
          played_together: playedTogether,
        })
        .select()
        .single();

      if (error) throw error;

      // Update times_played_together if they played
      if (playedTogether) {
        // Fetch current count first (no atomic increment in JS client)
        const { data: currentRoster } = await supabaseAdmin
          .from("roster")
          .select("times_played_together")
          .eq("id", rosterId)
          .single();

        const newCount = (currentRoster?.times_played_together || 0) + 1;

        await supabaseAdmin
          .from("roster")
          .update({
            times_played_together: newCount,
            last_played_together: new Date().toISOString(),
          })
          .eq("id", rosterId);
      }

      return data;
    } catch (error) {
      handleError(error, "recordHistory");
    }
  }

  // ============ WAIVER WIRE ============

  async getWaiverWire(date, excludeUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("waiver_wire")
        .select(
          `
          *,
          users!inner (first_name, last_name, username),
          user_profiles (avatar_url, handicap, social_rate, location, home_course)
        `
        )
        .eq("available_date", date)
        .eq("is_active", true)
        .neq("user_id", excludeUserId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("user_profiles(social_rate)", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) throw error;

      return (data || []).map((w) => {
        const user = w.users || {};
        const profile = w.user_profiles?.[0] || {};
        delete w.users;
        delete w.user_profiles;

        return {
          ...w,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: profile.avatar_url,
          handicap: profile.handicap,
          social_rate: profile.social_rate,
          location: profile.location,
          home_course: profile.home_course,
        };
      });
    } catch (error) {
      handleError(error, "getWaiverWire");
    }
  }

  async addToWaiverWire(userId, data) {
    const {
      availableDate,
      preferredTime,
      preferredCourse,
      maxHandicap,
      notes,
      expiresAt,
    } = data;

    try {
      const { data: wire, error } = await supabaseAdmin
        .from("waiver_wire")
        .upsert(
          {
            user_id: userId,
            available_date: availableDate,
            preferred_time: preferredTime,
            preferred_course: preferredCourse,
            max_handicap: maxHandicap,
            notes,
            expires_at: expiresAt,
            is_active: true,
          },
          {
            onConflict: "user_id,available_date",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return wire;
    } catch (error) {
      handleError(error, "addToWaiverWire");
    }
  }

  async removeFromWaiverWire(userId, date) {
    try {
      const { data, error } = await supabaseAdmin
        .from("waiver_wire")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("available_date", date)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "removeFromWaiverWire");
    }
  }

  async getMemberProfile(userId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select(
          `
          *,
          users!roster_contact_user_id_fkey (
            first_name, 
            last_name, 
            username, 
            phone_number,
            user_profiles (avatar_url, handicap, social_rate, location, home_course, preferred_tee_time, walk_or_ride, playing_partner_preference, rounds_played, average_score, bio, driver, irons, putter, ball)
          ),
          roster_groups (name, color)
        `
        )
        .eq("id", rosterId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      const user = data.users || {};
      // Handle nested profile
      const profileData = user.user_profiles;
      const profile = Array.isArray(profileData)
        ? profileData[0] || {}
        : profileData || {};

      const group = data.roster_groups || {};
      delete data.users;
      // Profile is inside users now, so we don't need to delete top-level user_profiles
      delete data.roster_groups;

      // Get history counts
      const { count: timesPlayed } = await supabaseAdmin
        .from("roster_member_history")
        .select("*", { count: "exact", head: true })
        .eq("roster_id", rosterId)
        .eq("played_together", true);

      const { count: invitesAccepted } = await supabaseAdmin
        .from("roster_member_history")
        .select("*", { count: "exact", head: true })
        .eq("roster_id", rosterId)
        .eq("invite_status", "accepted");

      const { count: totalInvites } = await supabaseAdmin
        .from("roster_member_history")
        .select("*", { count: "exact", head: true })
        .eq("roster_id", rosterId);

      return {
        ...data,
        ...user,
        ...profile,
        group_name: group.name,
        group_color: group.color,
        times_played: timesPlayed || 0,
        invites_accepted: invitesAccepted || 0,
        total_invites: totalInvites || 0,
      };
    } catch (error) {
      handleError(error, "getMemberProfile");
    }
  }
}

module.exports = new RosterRepository();

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
      const q = String(query || "").trim();
      if (q.length < 2) return [];
      const escaped = q.replace(/"/g, '""');
      // PostgREST ilike values must be double-quoted
      const pattern = `"%${escaped}%"`;
      const { data, error } = await supabaseAdmin
        .from("users")
        .select(
          "id, phone_number, first_name, last_name, username, user_profiles(avatar_url, handicap)"
        )
        .neq("id", excludeUserId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .or(
          `phone_number.ilike.${pattern},username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`
        )
        .limit(20);

      if (error) throw error;
      const rows = data || [];
      return rows.map((row) => {
        const profile = row.user_profiles?.[0] || row.user_profiles || {};
        const { user_profiles, ...rest } = row;
        return { ...rest, avatar_url: profile?.avatar_url, handicap: profile?.handicap };
      });
    } catch (error) {
      logger.error("searchUsers error", error);
      return [];
    }
  }

  /**
   * Search roster groups by name (for global search, Figma 795-6009)
   */
  async searchGroups(userId, query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) return [];
      const pattern = `%${query.trim()}%`;
      const { data, error } = await supabaseAdmin
        .from("roster_groups")
        .select("id, name, color, description")
        .eq("user_id", userId)
        .ilike("name", pattern)
        .order("position", { ascending: true })
        .limit(limit);

      if (error) throw error;

      const withCounts = await Promise.all(
        (data || []).map(async (g) => {
          const { count } = await supabaseAdmin
            .from("roster")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id);
          return { ...g, member_count: count || 0 };
        }),
      );
      return withCounts;
    } catch (error) {
      handleError(error, "searchGroups");
      return [];
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

      const { count, error } = await query;

      if (error) throw error;
      return (count ?? 0) > 0;
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

      const today = new Date().toISOString().split("T")[0];

      // Upcoming tee time count per group: fetch upcoming tee time IDs (user as creator), participants, and roster group membership
      let upcomingTeeTimeIds = [];
      try {
        const { data: upcomingRows } = await supabaseAdmin
          .from("tee_times")
          .select("id")
          .eq("creator_id", userId)
          .gte("tee_date", today)
          .in("status", ["pending", "confirmed"]);
        upcomingTeeTimeIds = (upcomingRows || []).map((r) => r.id);
      } catch (_) {}

      let participantsByTeeTime = [];
      if (upcomingTeeTimeIds.length > 0) {
        const { data: participants } = await supabaseAdmin
          .from("tee_time_participants")
          .select("tee_time_id, user_id")
          .in("tee_time_id", upcomingTeeTimeIds);
        participantsByTeeTime = participants || [];
      }

      const { data: rosterGroupMembers } = await supabaseAdmin
        .from("roster")
        .select("group_id, contact_user_id")
        .eq("user_id", userId)
        .not("group_id", "is", null);
      const groupMemberUserIds = {};
      (rosterGroupMembers || []).forEach((r) => {
        if (!groupMemberUserIds[r.group_id]) groupMemberUserIds[r.group_id] = new Set();
        if (r.contact_user_id) groupMemberUserIds[r.group_id].add(r.contact_user_id);
      });

      // Show all owned groups (including newly-created empty groups).
      // Filtering by roster membership here can hide valid groups right after create.
      const dataFiltered = data || [];

      const upcomingCountByGroup = {};
      Object.keys(groupMemberUserIds || {}).forEach((gid) => {
        const userIds = groupMemberUserIds[gid];
        const teeTimeIds = new Set();
        participantsByTeeTime.forEach((p) => {
          if (userIds.has(p.user_id)) teeTimeIds.add(p.tee_time_id);
        });
        upcomingCountByGroup[gid] = teeTimeIds.size;
      });

      // Group IDs that have at least one pending group invite (we are the inviter)
      let groupIdsWithPendingInvites = new Set();
      try {
        const { data: inviteNotifs } = await supabaseAdmin
          .from("notifications")
          .select("data")
          .filter("data->>type", "eq", "group_invite")
          .filter("data->>inviterId", "eq", String(userId));
        (inviteNotifs || []).forEach((n) => {
          const d = n.data || {};
          if (d.groupId && d.responded !== true) {
            groupIdsWithPendingInvites.add(d.groupId);
          }
        });
      } catch (_) {}

      // Get member counts for each group and attach upcoming_tee_time_count + has_pending_invites
      const groupsWithCounts = await Promise.all(
        dataFiltered.map(async (group) => {
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
            upcoming_tee_time_count: upcomingCountByGroup[group.id] ?? 0,
            is_owner: true,
            has_pending_invites: groupIdsWithPendingInvites.has(group.id),
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
      // Check for duplicate name (.maybeSingle() so 0 rows returns null, not an error)
      const { data: existing } = await supabaseAdmin
        .from("roster_groups")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", name)
        .maybeSingle();

      if (existing) {
        const error = new Error("You already have a roster with this name");
        error.code = "DUPLICATE_NAME";
        throw error;
      }

      // Get max position (.maybeSingle() so 0 groups returns null, not an error)
      const { data: maxData } = await supabaseAdmin
        .from("roster_groups")
        .select("position")
        .eq("user_id", userId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const position = (maxData?.position ?? -1) + 1;

      const insertPayload = {
        user_id: userId,
        name,
        description,
        color: color || "#5DB075",
        position,
        auto_invite: autoInvite !== false,
        max_members: maxMembers || 20,
      };
      if (icon != null && String(icon).trim() !== "") {
        insertPayload.icon = String(icon).trim();
      }
      let createdGroup;
      {
        const { data: group, error } = await supabaseAdmin
          .from("roster_groups")
          .insert(insertPayload)
          .select()
          .single();

        // Backward-compatible fallback: some DBs still have icon as VARCHAR(50).
        // If a long URL is provided, retry create without icon instead of failing.
        if (
          error &&
          error.code === "22001" &&
          insertPayload.icon
        ) {
          delete insertPayload.icon;
          const retry = await supabaseAdmin
            .from("roster_groups")
            .insert(insertPayload)
            .select()
            .single();
          if (retry.error) throw retry.error;
          createdGroup = retry.data;
        } else {
          if (error) throw error;
          createdGroup = group;
        }
      }
      return createdGroup;
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

      let updatedGroup;
      {
        const { data: group, error } = await supabaseAdmin
          .from("roster_groups")
          .update(updates)
          .eq("id", groupId)
          .eq("user_id", userId)
          .select()
          .single();

        // Backward-compatible fallback: if icon overflows old VARCHAR(50), retry without it.
        if (
          error &&
          error.code === "22001" &&
          Object.prototype.hasOwnProperty.call(updates, "icon")
        ) {
          const { icon: _droppedIcon, ...updatesWithoutIcon } = updates;
          const retry = await supabaseAdmin
            .from("roster_groups")
            .update(updatesWithoutIcon)
            .eq("id", groupId)
            .eq("user_id", userId)
            .select()
            .single();
          if (retry.error) throw retry.error;
          updatedGroup = retry.data;
        } else {
          if (error) throw error;
          updatedGroup = group;
        }
      }
      return updatedGroup;
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
          .maybeSingle();

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
            .maybeSingle();

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
      // Owner access first
      const { data: ownerGroup, error: ownerError } = await supabaseAdmin
        .from("roster_groups")
        .select("*")
        .eq("id", groupId)
        .eq("user_id", userId)
        .single();

      if (ownerError && ownerError.code !== "PGRST116") throw ownerError;

      let data = ownerGroup || null;
      let isOwner = !!ownerGroup;

      // If not owner, allow access for members in this group
      if (!data) {
        const { data: membership, error: membershipError } = await supabaseAdmin
          .from("roster")
          .select("id")
          .eq("user_id", userId)
          .eq("group_id", groupId)
          .limit(1)
          .maybeSingle();

        if (membershipError && membershipError.code !== "PGRST116") throw membershipError;
        if (!membership) return null;

        const { data: groupById, error: groupError } = await supabaseAdmin
          .from("roster_groups")
          .select("*")
          .eq("id", groupId)
          .single();

        if (groupError && groupError.code !== "PGRST116") throw groupError;
        if (!groupById) return null;

        data = groupById;
        isOwner = false;
      }

      const { count: memberCount } = await supabaseAdmin
        .from("roster")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      const { count: onDeckCount } = await supabaseAdmin
        .from("roster")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId)
        .eq("is_on_deck", true);

      return {
        ...data,
        member_count: memberCount || 0,
        on_deck_count: onDeckCount || 0,
        is_owner: isOwner,
      };
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
          users!roster_contact_user_id_fkey (first_name, last_name, username, user_profiles (avatar_url, handicap, social_rate, location, home_course, preferred_tee_time, walk_or_ride, rounds_played, average_score)),
          roster_groups (name, color)
        `
        )
        .eq("group_id", groupId);

      switch (sortBy) {
        case "socialRate":
          // Order by nested user_profiles not supported; sort in memory below
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

      let rows = (data || []).map((r) => {
        const user = r.users || {};
        const profileRow = user.user_profiles;
        const profile = Array.isArray(profileRow) ? profileRow[0] : profileRow || {};
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

      if (sortBy === "socialRate") {
        rows = rows.sort((a, b) => (b.profile_social_rate ?? 0) - (a.profile_social_rate ?? 0));
      }

      return rows;
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

  /**
   * Get roster contact user IDs for a user
   */
  async getRosterContactUserIds(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select("contact_user_id")
        .eq("user_id", userId)
        .not("contact_user_id", "is", null);

      if (error) throw error;
      return (data || []).map(r => r.contact_user_id);
    } catch (error) {
      handleError(error, "getRosterContactUserIds");
      return [];
    }
  }

  async getWaiverWire(date, excludeUserId, options = {}) {
    const { rosterConnectionsOnly = false, maxDistance = null, userLat = null, userLng = null } = options;
    
    try {
      let query = supabaseAdmin
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
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      // Filter by roster connections if requested
      if (rosterConnectionsOnly) {
        const rosterUserIds = await this.getRosterContactUserIds(excludeUserId);
        if (rosterUserIds.length > 0) {
          query = query.in("user_id", rosterUserIds);
        } else {
          // No roster connections, return empty array
          return [];
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      let results = (data || []).map((w) => {
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

      // Apply distance filtering if coordinates provided
      // Note: For now, distance filtering uses home course coordinates if available
      // In a production system, you might want to store user location coordinates separately
      if (maxDistance && userLat && userLng) {
        const courseRepository = require("./courseRepository");
        const R = 3959; // Earth radius in miles
        
        // Batch fetch course coordinates for all unique home courses
        const uniqueCourses = [...new Set(results.map(w => w.home_course).filter(Boolean))];
        const courseCoordinates = {};
        
        // Fetch coordinates for all courses in parallel
        await Promise.all(
          uniqueCourses.map(async (courseName) => {
            try {
              const courses = await courseRepository.searchCourses(courseName, 1);
              if (courses && courses.length > 0 && courses[0].latitude && courses[0].longitude) {
                courseCoordinates[courseName] = {
                  lat: courses[0].latitude,
                  lng: courses[0].longitude,
                };
              }
            } catch (err) {
              // Ignore course lookup errors
            }
          })
        );
        
        // Calculate distances and filter
        results = results.map((w) => {
          const coords = w.home_course ? courseCoordinates[w.home_course] : null;
          
          if (!coords) {
            // No coordinates available, include but without distance
            return { ...w, distance_miles: null };
          }
          
          const dLat = (coords.lat - userLat) * Math.PI / 180;
          const dLon = (coords.lng - userLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(userLat * Math.PI / 180) * Math.cos(coords.lat * Math.PI / 180) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance_miles = R * c;
          
          return { ...w, distance_miles };
        }).filter(w => 
          w.distance_miles === null || w.distance_miles <= maxDistance
        );
      }

      // Sort by social rate, then by distance if available
      results.sort((a, b) => {
        if (a.distance_miles !== undefined && b.distance_miles !== undefined) {
          return a.distance_miles - b.distance_miles;
        }
        return (b.social_rate || 0) - (a.social_rate || 0);
      });

      return results;
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

  /**
   * Distinct contact_user_id values in a roster group (for notifying members).
   * @param {string} ownerUserId - Roster owner
   * @param {string} groupId - roster_groups.id
   * @returns {Promise<string[]>}
   */
  async getContactUserIdsForGroup(ownerUserId, groupId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select("contact_user_id")
        .eq("user_id", ownerUserId)
        .eq("group_id", groupId)
        .not("contact_user_id", "is", null);

      if (error) throw error;
      const ids = [
        ...new Set(
          (data || [])
            .map((r) => r.contact_user_id)
            .filter(Boolean),
        ),
      ];
      return ids;
    } catch (error) {
      handleError(error, "getContactUserIdsForGroup");
    }
  }
}

module.exports = new RosterRepository();

const { supabaseAdmin, handleError } = require("../config/supabase");
const logger = require("../config/logger");

/**
 * Roster rows with group_id are contacts in the group; the creator is roster_groups.user_id
 * and is not a roster row. Total people = contacts + owner.
 * Multiple groups per contact use roster_group_members (junction); roster.group_id is a display hint.
 */
function totalGroupMemberCount(rosterRowCount) {
  return (Number(rosterRowCount) || 0) + 1;
}

class RosterRepository {
  /**
   * Roster row ids in this group: roster_group_members plus legacy roster.group_id rows.
   */
  async collectRosterIdsForGroupMembership(groupId) {
    const idSet = new Set();
    const { data: fromRgm, error: e1 } = await supabaseAdmin
      .from("roster_group_members")
      .select("roster_id")
      .eq("group_id", groupId);
    if (e1) throw e1;
    (fromRgm || []).forEach((r) => {
      if (r.roster_id) idSet.add(r.roster_id);
    });
    const { data: fromLegacy, error: e2 } = await supabaseAdmin
      .from("roster")
      .select("id")
      .eq("group_id", groupId);
    if (e2) throw e2;
    (fromLegacy || []).forEach((r) => {
      if (r.id) idSet.add(r.id);
    });
    return [...idSet];
  }

  async ensureRosterGroupMember(groupId, rosterId) {
    const { error } = await supabaseAdmin.from("roster_group_members").insert({
      group_id: groupId,
      roster_id: rosterId,
    });
    if (error && error.code !== "23505") throw error;
  }

  /**
   * Drop membership in one group; set roster.group_id from any remaining membership or null.
   * @returns {Promise<boolean>} true if this roster row was in that group (RGM or legacy group_id).
   */
  async removeRosterFromGroupMembership(groupId, rosterId) {
    const { data: row } = await supabaseAdmin
      .from("roster")
      .select("group_id")
      .eq("id", rosterId)
      .maybeSingle();
    const matchedLegacy =
      row?.group_id != null && String(row.group_id) === String(groupId);

    const { data: deleted, error: delErr } = await supabaseAdmin
      .from("roster_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("roster_id", rosterId)
      .select("id");
    if (delErr) throw delErr;
    const hadRgmRemoval = (deleted || []).length > 0;

    const { data: rest } = await supabaseAdmin
      .from("roster_group_members")
      .select("group_id")
      .eq("roster_id", rosterId);
    const nextGid = rest?.[0]?.group_id ?? null;
    await supabaseAdmin
      .from("roster")
      .update({ group_id: nextGid })
      .eq("id", rosterId);

    return hadRgmRemoval || matchedLegacy;
  }

  /** Contact on owner's roster is in group via legacy column or junction. */
  async rosterContactHasGroupMembership(rosterOwnerUserId, groupId, contactUserId) {
    const { data: rows, error } = await supabaseAdmin
      .from("roster")
      .select("id, group_id")
      .eq("user_id", rosterOwnerUserId)
      .eq("contact_user_id", contactUserId);
    if (error) throw error;
    if (!rows?.length) return false;
    for (const r of rows) {
      if (r.group_id != null && String(r.group_id) === String(groupId)) {
        return true;
      }
    }
    const rids = rows.map((r) => r.id);
    const { data: rgm } = await supabaseAdmin
      .from("roster_group_members")
      .select("id")
      .eq("group_id", groupId)
      .in("roster_id", rids)
      .limit(1);
    return (rgm || []).length > 0;
  }

  async getRoster(userId, options = {}) {
    const { groupId, sortBy = "position", isOnDeck } = options;

    try {
      let groupRosterIdFilter = null;
      let groupMetaForFilter = null;
      if (groupId) {
        const membershipIds = await this.collectRosterIdsForGroupMembership(groupId);
        if (membershipIds.length === 0) {
          return [];
        }
        const chunkSize = 150;
        const mineIds = new Set();
        for (let i = 0; i < membershipIds.length; i += chunkSize) {
          const chunk = membershipIds.slice(i, i + chunkSize);
          const { data: mine, error: mineErr } = await supabaseAdmin
            .from("roster")
            .select("id")
            .eq("user_id", userId)
            .in("id", chunk);
          if (mineErr) throw mineErr;
          (mine || []).forEach((r) => mineIds.add(r.id));
        }
        groupRosterIdFilter = [...mineIds];
        if (groupRosterIdFilter.length === 0) {
          return [];
        }
        const { data: gMeta } = await supabaseAdmin
          .from("roster_groups")
          .select("name, color")
          .eq("id", groupId)
          .maybeSingle();
        groupMetaForFilter = gMeta || null;
      }

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

      if (groupRosterIdFilter) {
        query = query.in("id", groupRosterIdFilter);
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
          group_name: groupMetaForFilter?.name ?? group.name,
          group_color: groupMetaForFilter?.color ?? group.color,
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

  /**
   * Minimal row for owner checks (move/toggle) — no joins, avoids PGRST201 and extra latency.
   */
  async getRosterOwnerRow(userId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select("id, is_on_deck, contact_user_id")
        .eq("id", rosterId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "getRosterOwnerRow");
    }
  }

  async getRosterEntry(userId, rosterId) {
    try {
      // Fetch roster without embedding `users`: roster has two FKs to users (user_id,
      // contact_user_id), and some PostgREST setups still return PGRST201 for nested selects.
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select("*")
        .eq("id", rosterId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      let first_name;
      let last_name;
      let username;
      let avatar_url;
      if (data.contact_user_id) {
        const { data: contact, error: contactErr } = await supabaseAdmin
          .from("users")
          .select("first_name, last_name, username, user_profiles(avatar_url)")
          .eq("id", data.contact_user_id)
          .maybeSingle();
        if (!contactErr && contact) {
          first_name = contact.first_name;
          last_name = contact.last_name;
          username = contact.username;
          const profileData = contact.user_profiles;
          const profile = Array.isArray(profileData)
            ? profileData[0] || {}
            : profileData || {};
          avatar_url = profile.avatar_url;
        }
      }

      return {
        ...data,
        first_name,
        last_name,
        username,
        avatar_url,
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
          const rids = await this.collectRosterIdsForGroupMembership(g.id);
          let count = 0;
          if (rids.length > 0 && g.user_id) {
            const ownChunk = 150;
            for (let i = 0; i < rids.length; i += ownChunk) {
              const chunk = rids.slice(i, i + ownChunk);
              const { count: c, error: cErr } = await supabaseAdmin
                .from("roster")
                .select("*", { count: "exact", head: true })
                .eq("user_id", g.user_id)
                .in("id", chunk);
              if (cErr) throw cErr;
              count += c ?? 0;
            }
          }
          return { ...g, member_count: totalGroupMemberCount(count) };
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

  /**
   * All roster rows for a contact on the owner's roster (personal + group-linked).
   * Used for QR scan context (on roster vs on-deck).
   */
  async getContactRosterRows(ownerUserId, contactUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select("id, is_on_deck, group_id")
        .eq("user_id", ownerUserId)
        .eq("contact_user_id", contactUserId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getContactRosterRows");
    }
  }

  /**
   * Delete the owner's roster row for this contact only when it is not tied to any roster group.
   * Used when blocking: removing mutual personal roster links must not drop anyone from shared groups.
   * @returns {Promise<boolean>} true if a row was deleted
   */
  async deleteContactRowIfNoGroupMembership(ownerUserId, contactUserId) {
    try {
      const { data: row, error: selErr } = await supabaseAdmin
        .from("roster")
        .select("id, group_id")
        .eq("user_id", ownerUserId)
        .eq("contact_user_id", contactUserId)
        .maybeSingle();

      if (selErr && selErr.code !== "PGRST116") throw selErr;
      if (!row) return false;

      if (row.group_id != null) {
        return false;
      }

      const { count, error: cntErr } = await supabaseAdmin
        .from("roster_group_members")
        .select("id", { count: "exact", head: true })
        .eq("roster_id", row.id);

      if (cntErr) throw cntErr;
      if ((count ?? 0) > 0) {
        return false;
      }

      const { error: delErr } = await supabaseAdmin
        .from("roster")
        .delete()
        .eq("id", row.id)
        .eq("user_id", ownerUserId);

      if (delErr) throw delErr;
      return true;
    } catch (error) {
      handleError(error, "deleteContactRowIfNoGroupMembership");
    }
  }

  // ============ ROSTER GROUPS ============

  async getGroups(userId) {
    try {
      const { data: owned, error } = await supabaseAdmin
        .from("roster_groups")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const ownedList = owned || [];
      const ownedIds = new Set(ownedList.map((g) => g.id));

      // Groups you joined by accepting an invite: you appear on the owner's roster with group_id set.
      // Inner join roster_groups so stale/orphan group_id values (e.g. after a delete) never produce a list entry.
      const { data: memberJoinRows, error: memberErr } = await supabaseAdmin
        .from("roster")
        .select(
          `
          group_id,
          roster_groups!inner (*)
        `,
        )
        .eq("contact_user_id", userId)
        .not("group_id", "is", null);

      if (memberErr) throw memberErr;

      const joinedById = new Map();
      for (const row of memberJoinRows || []) {
        const embedded = row.roster_groups;
        const g = Array.isArray(embedded) ? embedded[0] : embedded;
        if (!g?.id || ownedIds.has(g.id)) continue;
        joinedById.set(g.id, g);
      }

      const { data: contactRosterRows } = await supabaseAdmin
        .from("roster")
        .select("id")
        .eq("contact_user_id", userId);
      const contactRosterIds = (contactRosterRows || []).map((r) => r.id);
      if (contactRosterIds.length > 0) {
        const rgmChunk = 100;
        const extraGroupIds = new Set();
        for (let i = 0; i < contactRosterIds.length; i += rgmChunk) {
          const chunk = contactRosterIds.slice(i, i + rgmChunk);
          const { data: rgms, error: rgmErr } = await supabaseAdmin
            .from("roster_group_members")
            .select("group_id")
            .in("roster_id", chunk);
          if (rgmErr) throw rgmErr;
          (rgms || []).forEach((x) => {
            if (x.group_id) extraGroupIds.add(String(x.group_id));
          });
        }
        const toFetch = [...extraGroupIds].filter((id) => !ownedIds.has(id));
        if (toFetch.length > 0) {
          const { data: extraGrps, error: egErr } = await supabaseAdmin
            .from("roster_groups")
            .select("*")
            .in("id", toFetch);
          if (egErr) throw egErr;
          for (const g of extraGrps || []) {
            if (!g?.id || ownedIds.has(g.id)) continue;
            joinedById.set(g.id, g);
          }
        }
      }

      let joinedGroups = [...joinedById.values()];
      joinedGroups.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      );

      // Owned first (manual order), then groups you are a member of but do not own.
      let dataFiltered = [...ownedList, ...joinedGroups];

      // Only return groups that still exist (owner may have deleted / left after our queries).
      const mergedIds = [
        ...new Set(
          dataFiltered.map((g) => g.id).filter(Boolean).map(String),
        ),
      ];
      if (mergedIds.length > 0) {
        const existingIds = new Set();
        const chunkSize = 100;
        for (let i = 0; i < mergedIds.length; i += chunkSize) {
          const chunk = mergedIds.slice(i, i + chunkSize);
          const { data: existingRows, error: exErr } = await supabaseAdmin
            .from("roster_groups")
            .select("id")
            .in("id", chunk);
          if (exErr) throw exErr;
          (existingRows || []).forEach((r) => existingIds.add(String(r.id)));
        }
        dataFiltered = dataFiltered.filter(
          (g) => g.id && existingIds.has(String(g.id)),
        );
      }

      const today = new Date().toISOString().split("T")[0];

      // Upcoming tee time count: viewer as creator; participants overlap group roster (owner + contacts).
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

      const allGroupIds = dataFiltered.map((g) => g.id).filter(Boolean);
      const groupMemberUserIds = {};
      if (allGroupIds.length > 0) {
        const rowChunk = 100;
        for (const gid of allGroupIds) {
          const rids = await this.collectRosterIdsForGroupMembership(gid);
          if (!rids.length) continue;
          if (!groupMemberUserIds[gid]) groupMemberUserIds[gid] = new Set();
          for (let i = 0; i < rids.length; i += rowChunk) {
            const chunk = rids.slice(i, i + rowChunk);
            const { data: rrows, error: rgErr } = await supabaseAdmin
              .from("roster")
              .select("contact_user_id, user_id")
              .in("id", chunk);
            if (rgErr) throw rgErr;
            (rrows || []).forEach((r) => {
              if (r.contact_user_id) groupMemberUserIds[gid].add(r.contact_user_id);
              if (r.user_id) groupMemberUserIds[gid].add(r.user_id);
            });
          }
        }
      }

      const upcomingCountByGroup = {};
      Object.keys(groupMemberUserIds).forEach((gid) => {
        const userIds = groupMemberUserIds[gid];
        const teeTimeIds = new Set();
        participantsByTeeTime.forEach((p) => {
          if (userIds.has(p.user_id)) teeTimeIds.add(p.tee_time_id);
        });
        upcomingCountByGroup[gid] = teeTimeIds.size;
      });

      // Pending outbound invites (only relevant when you own the group)
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

      const groupsWithCounts = await Promise.all(
        dataFiltered.map(async (group) => {
          const rosterInGroupIds = await this.collectRosterIdsForGroupMembership(
            group.id,
          );
          let memberCount = 0;
          let onDeckCount = 0;
          const groupOwnerUserId = group.user_id;
          if (rosterInGroupIds.length > 0 && groupOwnerUserId) {
            const ownChunk = 150;
            for (let i = 0; i < rosterInGroupIds.length; i += ownChunk) {
              const chunk = rosterInGroupIds.slice(i, i + ownChunk);
              const { data: orows, error: ocErr } = await supabaseAdmin
                .from("roster")
                .select("is_on_deck")
                .eq("user_id", groupOwnerUserId)
                .in("id", chunk);
              if (ocErr) throw ocErr;
              (orows || []).forEach((r) => {
                memberCount += 1;
                if (r.is_on_deck) onDeckCount += 1;
              });
            }
          }

          const isOwner = ownedIds.has(group.id);

          return {
            ...group,
            member_count: totalGroupMemberCount(memberCount),
            on_deck_count: onDeckCount || 0,
            upcoming_tee_time_count: upcomingCountByGroup[group.id] ?? 0,
            is_owner: isOwner,
            has_pending_invites:
              isOwner && groupIdsWithPendingInvites.has(group.id),
          };
        }),
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
      const rids = await this.collectRosterIdsForGroupMembership(groupId);
      if (rids.length === 0) return [];

      const mapRow = (r) => {
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
          phone_number: user.phone_number,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
          social_rate: profile.social_rate,
        };
      };

      const chunkSize = 80;
      const out = [];
      for (let i = 0; i < rids.length; i += chunkSize) {
        const chunk = rids.slice(i, i + chunkSize);
        const { data, error } = await supabaseAdmin
          .from("roster")
          .select(
            `
          *,
          users!roster_contact_user_id_fkey (
            first_name, last_name, username, phone_number,
            user_profiles (avatar_url, handicap, social_rate)
          )
        `,
          )
          .eq("user_id", userId)
          .in("id", chunk)
          .eq("is_on_deck", false)
          .order("position", { ascending: true });

        if (error) throw error;
        (data || []).forEach((r) => out.push(mapRow(r)));
      }

      out.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return out;
    } catch (error) {
      handleError(error, "getAutoInviteMembers");
    }
  }

  /**
   * Close out pending group_invite notifications for this group (all recipients).
   * Best-effort so invite UIs do not reference a deleted group.
   */
  async dismissGroupInviteNotificationsForGroup(groupId) {
    try {
      const gid = String(groupId);
      const { data: rows, error } = await supabaseAdmin
        .from("notifications")
        .select("id, data")
        .filter("data->>type", "eq", "group_invite")
        .filter("data->>groupId", "eq", gid);

      if (error) {
        logger.warn("dismissGroupInviteNotificationsForGroup select failed", error);
        return;
      }

      for (const row of rows || []) {
        const d = row.data || {};
        if (d.responded === true) continue;
        const { error: upErr } = await supabaseAdmin
          .from("notifications")
          .update({
            data: { ...d, responded: true, group_deleted: true },
          })
          .eq("id", row.id);
        if (upErr) {
          logger.warn("dismissGroupInviteNotificationsForGroup update failed", {
            id: row.id,
            error: upErr,
          });
        }
      }
    } catch (err) {
      logger.warn("dismissGroupInviteNotificationsForGroup", err);
    }
  }

  async deleteGroup(userId, groupId) {
    try {
      // Clear group_id on every roster row pointing at this group (not only the owner's rows).
      await supabaseAdmin
        .from("roster")
        .update({ group_id: null })
        .eq("group_id", groupId);

      await this.dismissGroupInviteNotificationsForGroup(groupId);

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
          await this.ensureRosterGroupMember(groupId, rosterEntry.id);
          const { data: rRow } = await supabaseAdmin
            .from("roster")
            .select("group_id")
            .eq("id", rosterEntry.id)
            .maybeSingle();
          if (rRow && rRow.group_id == null) {
            await supabaseAdmin
              .from("roster")
              .update({ group_id: groupId })
              .eq("id", rosterEntry.id);
          }
          addedCount++;
        } else {
          const { data: maxData } = await supabaseAdmin
            .from("roster")
            .select("position")
            .eq("user_id", userId)
            .order("position", { ascending: false })
            .limit(1)
            .maybeSingle();

          const position = (maxData?.position ?? -1) + 1;

          const { data: inserted, error: insErr } = await supabaseAdmin
            .from("roster")
            .insert({
              user_id: userId,
              contact_user_id: memberUserId,
              group_id: groupId,
              position,
            })
            .select("id")
            .single();
          if (insErr) throw insErr;
          if (inserted?.id) {
            await this.ensureRosterGroupMember(groupId, inserted.id);
          }
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

      // If not roster_groups owner, allow group members / chat participants
      if (!data) {
        const { data: groupById, error: groupError } = await supabaseAdmin
          .from("roster_groups")
          .select("*")
          .eq("id", groupId)
          .single();

        if (groupError && groupError.code !== "PGRST116") throw groupError;
        if (!groupById) return null;

        let hasAccess = false;
        const groupOwnerUserId = groupById.user_id;

        const inGroupIds = await this.collectRosterIdsForGroupMembership(groupId);
        if (inGroupIds.length > 0) {
          const { data: rosterOwnerRow, error: rosterOwnerErr } = await supabaseAdmin
            .from("roster")
            .select("id")
            .eq("user_id", userId)
            .in("id", inGroupIds)
            .limit(1)
            .maybeSingle();

          if (rosterOwnerErr && rosterOwnerErr.code !== "PGRST116") {
            throw rosterOwnerErr;
          }
          if (rosterOwnerRow) hasAccess = true;
        }

        if (!hasAccess) {
          const asContact = await this.rosterContactHasGroupMembership(
            groupOwnerUserId,
            groupId,
            userId,
          );
          if (asContact) hasAccess = true;
        }

        if (!hasAccess) {
          const { data: conv } = await supabaseAdmin
            .from("conversations")
            .select("id")
            .eq("type", "group")
            .eq("roster_group_id", groupId)
            .limit(1)
            .maybeSingle();

          if (conv?.id) {
            const { data: part, error: partErr } = await supabaseAdmin
              .from("conversation_participants")
              .select("id")
              .eq("conversation_id", conv.id)
              .eq("user_id", userId)
              .is("left_at", null)
              .limit(1)
              .maybeSingle();

            if (partErr && partErr.code !== "PGRST116") throw partErr;
            if (part) hasAccess = true;
          }
        }

        if (!hasAccess) return null;

        data = groupById;
        isOwner = false;
      }

      const groupOwnerUserId = data.user_id;
      const rosterInGroupIds = await this.collectRosterIdsForGroupMembership(groupId);
      let memberCount = 0;
      let onDeckCount = 0;
      if (rosterInGroupIds.length > 0) {
        const chunkSize = 150;
        for (let i = 0; i < rosterInGroupIds.length; i += chunkSize) {
          const chunk = rosterInGroupIds.slice(i, i + chunkSize);
          const { data: orows, error: ocErr } = await supabaseAdmin
            .from("roster")
            .select("id, is_on_deck")
            .eq("user_id", groupOwnerUserId)
            .in("id", chunk);
          if (ocErr) throw ocErr;
          (orows || []).forEach((r) => {
            memberCount += 1;
            if (r.is_on_deck) onDeckCount += 1;
          });
        }
      }

      return {
        ...data,
        member_count: totalGroupMemberCount(memberCount),
        on_deck_count: onDeckCount || 0,
        is_owner: isOwner,
      };
    } catch (error) {
      handleError(error, "getGroupWithAccess");
    }
  }

  /**
   * Outbound group invites not yet accepted (inviter's pending requests).
   * Each row: { notificationId, userId } (invitee).
   */
  async getPendingGroupInvitees(inviterId, groupId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .select("id, user_id, data")
        .filter("data->>type", "eq", "group_invite")
        .filter("data->>groupId", "eq", String(groupId))
        .filter("data->>inviterId", "eq", String(inviterId));

      if (error) throw error;

      const out = [];
      for (const row of data || []) {
        const d = row.data || {};
        if (d.responded === true) continue;
        const uid = row.user_id;
        if (!uid) continue;
        out.push({ notificationId: row.id, userId: uid });
      }
      return out;
    } catch (error) {
      handleError(error, "getPendingGroupInvitees");
    }
  }

  async getGroupMembersForGroup(groupId, sortBy = "position") {
    try {
      const rosterIds = await this.collectRosterIdsForGroupMembership(groupId);
      if (rosterIds.length === 0) return [];

      const { data: gMeta } = await supabaseAdmin
        .from("roster_groups")
        .select("name, color")
        .eq("id", groupId)
        .maybeSingle();

      const mapRow = (r) => {
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
          group_name: gMeta?.name ?? group.name,
          group_color: gMeta?.color ?? group.color,
        };
      };

      const chunkSize = 100;
      const byId = new Map();
      for (let i = 0; i < rosterIds.length; i += chunkSize) {
        const chunk = rosterIds.slice(i, i + chunkSize);
        const { data, error } = await supabaseAdmin
          .from("roster")
          .select(
            `
          *,
          users!roster_contact_user_id_fkey (first_name, last_name, username, user_profiles (avatar_url, handicap, social_rate, location, home_course, preferred_tee_time, walk_or_ride, rounds_played, average_score)),
          roster_groups (name, color)
        `,
          )
          .in("id", chunk);
        if (error) throw error;
        (data || []).forEach((r) => byId.set(r.id, mapRow(r)));
      }

      let rows = [...byId.values()];

      switch (sortBy) {
        case "socialRate":
          rows.sort(
            (a, b) => (b.profile_social_rate ?? 0) - (a.profile_social_rate ?? 0),
          );
          break;
        case "handicap":
          rows.sort((a, b) => {
            const ah = a.contact_handicap;
            const bh = b.contact_handicap;
            const an = ah == null ? Infinity : Number(ah);
            const bn = bh == null ? Infinity : Number(bh);
            return an - bn;
          });
          break;
        case "name":
          rows.sort((a, b) =>
            (a.contact_name || `${a.first_name || ""} ${a.last_name || ""}`)
              .trim()
              .localeCompare(
                (b.contact_name || `${b.first_name || ""} ${b.last_name || ""}`).trim(),
                undefined,
                { sensitivity: "base" },
              ),
          );
          break;
        default:
          rows.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
      await this.ensureRosterGroupMember(groupId, rosterId);
      return data;
    } catch (error) {
      handleError(error, "addToGroup");
    }
  }

  async removeFromGroup(userId, rosterId, options = {}) {
    const { removeFromGroupId } = options;
    try {
      const { data: owns } = await supabaseAdmin
        .from("roster")
        .select("id")
        .eq("id", rosterId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!owns) return null;

      if (removeFromGroupId) {
        const changed = await this.removeRosterFromGroupMembership(
          removeFromGroupId,
          rosterId,
        );
        if (!changed) return null;
        const { data, error } = await supabaseAdmin
          .from("roster")
          .select()
          .eq("id", rosterId)
          .eq("user_id", userId)
          .single();
        if (error) throw error;
        return data;
      }

      await supabaseAdmin
        .from("roster_group_members")
        .delete()
        .eq("roster_id", rosterId);

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
      // Only send columns that were provided (undefined must not hit PostgREST).
      // NOTE: `newPosition !== null` is true when newPosition is undefined — that used to run
      // .gte("position", undefined) and break the request (500 / Failed to move member).
      const updates = {};
      if (targetGroupId !== undefined) {
        updates.group_id = targetGroupId;
      }
      if (typeof isOnDeck === "boolean") {
        updates.is_on_deck = isOnDeck;
      }
      if (typeof newPosition === "number" && Number.isFinite(newPosition)) {
        updates.position = Math.floor(newPosition);
      }

      if (Object.keys(updates).length === 0) {
        const err = new Error(
          "Nothing to update: provide targetGroupId, isOnDeck, and/or newPosition",
        );
        err.statusCode = 400;
        throw err;
      }

      const { data, error } = await supabaseAdmin
        .from("roster")
        .update(updates)
        .eq("id", rosterId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      if (targetGroupId !== undefined) {
        if (targetGroupId === null) {
          await supabaseAdmin
            .from("roster_group_members")
            .delete()
            .eq("roster_id", rosterId);
        } else {
          await this.ensureRosterGroupMember(targetGroupId, rosterId);
        }
      }

      const positionForShift =
        typeof updates.position === "number" ? updates.position : null;
      const deckForShift =
        typeof updates.is_on_deck === "boolean"
          ? updates.is_on_deck
          : data.is_on_deck;

      if (positionForShift !== null) {
        const { data: itemsToShift, error: shiftErr } = await supabaseAdmin
          .from("roster")
          .select("id, position")
          .eq("user_id", userId)
          .neq("id", rosterId)
          .gte("position", positionForShift)
          .eq("is_on_deck", deckForShift);

        if (shiftErr) throw shiftErr;

        // Bump positions highest-first so we never briefly violate unique ordering / duplicates.
        if (itemsToShift && itemsToShift.length > 0) {
          const sorted = [...itemsToShift].sort(
            (a, b) => b.position - a.position,
          );
          for (const row of sorted) {
            const { error: bumpErr } = await supabaseAdmin
              .from("roster")
              .update({ position: row.position + 1 })
              .eq("id", row.id);
            if (bumpErr) throw bumpErr;
          }
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

  /**
   * Roster row owned by user (minimal fetch for authorization).
   * @returns {Promise<{ contact_user_id: string | null } | null>}
   */
  async getOwnedRosterRow(ownerUserId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select("contact_user_id")
        .eq("id", rosterId)
        .eq("user_id", ownerUserId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data ?? null;
    } catch (error) {
      handleError(error, "getOwnedRosterRow");
    }
  }

  async getMemberProfile(userId, rosterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("roster")
        .select("*")
        .eq("id", rosterId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      let group_name;
      let group_color;
      if (data.group_id) {
        const { data: g } = await supabaseAdmin
          .from("roster_groups")
          .select("name, color")
          .eq("id", data.group_id)
          .maybeSingle();
        group_name = g?.name;
        group_color = g?.color;
      }

      let merged = { ...data };

      if (data.contact_user_id) {
        const { data: contact, error: cErr } = await supabaseAdmin
          .from("users")
          .select(
            `first_name, last_name, username, phone_number,
            user_profiles (avatar_url, handicap, social_rate, location, home_course, preferred_tee_time, walk_or_ride, playing_partner_preference, rounds_played, average_score, bio, driver, irons, putter, ball, clubs)`
          )
          .eq("id", data.contact_user_id)
          .maybeSingle();

        if (!cErr && contact) {
          const profileData = contact.user_profiles;
          const up = Array.isArray(profileData)
            ? profileData[0] || {}
            : profileData || {};
          merged = {
            ...merged,
            first_name: contact.first_name,
            last_name: contact.last_name,
            username: contact.username,
            phone_number: contact.phone_number,
            avatar_url: up.avatar_url,
            user_handicap: up.handicap,
            profile_social_rate: up.social_rate,
            profile_clubs: up.clubs,
            location: up.location,
            home_course: up.home_course,
            preferred_tee_time: up.preferred_tee_time,
            walk_or_ride: up.walk_or_ride,
            playing_partner_preference: up.playing_partner_preference,
            rounds_played: up.rounds_played,
            average_score: up.average_score,
            bio: up.bio,
            equipment: {
              driver: up.driver,
              irons: up.irons,
              putter: up.putter,
              ball: up.ball,
            },
          };
        }
      }

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

      let blocked_you = false;
      if (data.contact_user_id) {
        const { data: blk } = await supabaseAdmin
          .from("blocked_users")
          .select("id")
          .eq("user_id", data.contact_user_id)
          .eq("blocked_user_id", userId)
          .maybeSingle();
        blocked_you = !!blk;
      }

      return {
        ...merged,
        group_name,
        group_color,
        blocked_you,
        times_played_together: timesPlayed || 0,
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
      const rids = await this.collectRosterIdsForGroupMembership(groupId);
      if (rids.length === 0) return [];

      const chunkSize = 150;
      const idSet = new Set();
      for (let i = 0; i < rids.length; i += chunkSize) {
        const chunk = rids.slice(i, i + chunkSize);
        const { data, error } = await supabaseAdmin
          .from("roster")
          .select("contact_user_id")
          .eq("user_id", ownerUserId)
          .in("id", chunk)
          .not("contact_user_id", "is", null);
        if (error) throw error;
        (data || []).forEach((r) => {
          if (r.contact_user_id) idSet.add(r.contact_user_id);
        });
      }
      return [...idSet];
    } catch (error) {
      handleError(error, "getContactUserIdsForGroup");
    }
  }
}

module.exports = new RosterRepository();

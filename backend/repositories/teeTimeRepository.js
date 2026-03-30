const { supabaseAdmin, handleError } = require("../config/supabase");
const logger = require("../config/logger");
const { createTeeDateTime } = require("../utils/dateUtils");
const courseRepository = require("./courseRepository");

class TeeTimeRepository {
  async createTeeTime(creatorId, teeTimeData) {
    const {
      courseName,
      courseLocation,
      courseId,
      teeDate,
      teeTime,
      maxPlayers,
      inviteType,
      notes,
      distanceRadius,
    } = teeTimeData;

    // Store distance radius in notes as JSON for Open invites
    // TODO: Add distance_radius column to tee_times table via migration
    let notesWithMetadata = notes;
    if (inviteType === "open" && distanceRadius) {
      const metadata = { distanceRadius };
      notesWithMetadata = notes 
        ? JSON.stringify({ ...JSON.parse(notes || "{}"), ...metadata })
        : JSON.stringify(metadata);
    }

    try {
      const { data: teeTimeRecord, error } = await supabaseAdmin
        .from("tee_times")
        .insert({
          creator_id: creatorId,
          course_name: courseName,
          course_location: courseLocation,
          course_id: courseId || null,
          tee_date: teeDate,
          tee_time: teeTime,
          max_players: maxPlayers || 4,
          invite_type: inviteType || "roster",
          notes: notesWithMetadata,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as first participant
      await this.addParticipant(
        teeTimeRecord.id,
        creatorId,
        null,
        null,
        0,
        true,
      );

      return teeTimeRecord;
    } catch (error) {
      handleError(error, "createTeeTime");
    }
  }

  async getTeeTimeById(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_times")
        .select(
          `
          *,
          users!tee_times_creator_id_fkey (
            first_name, 
            last_name, 
            username,
            user_profiles (avatar_url)
          )
        `,
        )
        .eq("id", teeTimeId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) return null;

      const user = data.users || {};
      const profileData = user.user_profiles;
      const profile = Array.isArray(profileData)
        ? profileData[0] || {}
        : profileData || {};

      delete data.users;

      return {
        ...data,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_url: profile.avatar_url,
      };
    } catch (error) {
      handleError(error, "getTeeTimeById");
    }
  }

  async getUserTeeTimes(userId, status = null) {
    try {
      // Get tee times where user is creator
      let creatorQuery = supabaseAdmin
        .from("tee_times")
        .select(
          `
          *,
          users!tee_times_creator_id_fkey (first_name, last_name)
        `,
        )
        .eq("creator_id", userId);

      if (status) {
        creatorQuery = creatorQuery.eq("status", status);
      }

      const { data: creatorTeeTimes, error: creatorError } = await creatorQuery
        .order("tee_date", { ascending: true })
        .order("tee_time", { ascending: true });

      if (creatorError) throw creatorError;

      // Get tee times where user is participant
      // Explicitly include confirmed status participants
      let participantQuery = supabaseAdmin
        .from("tee_time_participants")
        .select(
          `
          tee_time_id,
          status,
          tee_times!inner (
            *,
            users!tee_times_creator_id_fkey (first_name, last_name)
          )
        `,
        )
        .eq("user_id", userId)
        .or("status.is.null,status.eq.confirmed,status.neq.cancelled");

      if (status) {
        participantQuery = participantQuery.eq("tee_times.status", status);
      }

      // Note: Can't order by foreign table columns in Supabase, will sort in JS
      const { data: participantTeeTimes, error: participantError } =
        await participantQuery;

      if (participantError) throw participantError;

      // Combine and deduplicate
      const teeTimeMap = new Map();

      (creatorTeeTimes || []).forEach((tt) => {
        teeTimeMap.set(tt.id, tt);
      });

      (participantTeeTimes || []).forEach((p) => {
        if (p.tee_times && !teeTimeMap.has(p.tee_times.id)) {
          teeTimeMap.set(p.tee_times.id, p.tee_times);
        }
      });

      // Get participant counts for all tee times
      const teeTimesWithCounts = await Promise.all(
        Array.from(teeTimeMap.values()).map(async (tt) => {
          const { count } = await supabaseAdmin
            .from("tee_time_participants")
            .select("*", { count: "exact", head: true })
            .eq("tee_time_id", tt.id)
            .or("status.is.null,status.eq.confirmed,status.neq.cancelled");

          const user = tt.users || {};
          delete tt.users;

          return {
            ...tt,
            creator_first_name: user.first_name,
            creator_last_name: user.last_name,
            participant_count: count || 0,
          };
        }),
      );

      // Sort by date and time
      return teeTimesWithCounts.sort((a, b) => {
        const dateCompare = (a.tee_date || "").localeCompare(b.tee_date || "");
        if (dateCompare !== 0) return dateCompare;
        return (a.tee_time || "").localeCompare(b.tee_time || "");
      });
    } catch (error) {
      handleError(error, "getUserTeeTimes");
    }
  }

  async getUpcomingTeeTimes(userId, limit = 10) {
    try {
      const logger = require("../config/logger");
      const { invitesLogger } = require("../config/logger");

      // Include in_progress: confirmed tee times move here when a player cancels participation
      // but the event is still upcoming (same as calendar / schedule view).
      const upcomingStatuses = ["pending", "confirmed", "in_progress"];

      // Get tee times where user is creator
      const { data: creatorTeeTimes, error: creatorError } = await supabaseAdmin
        .from("tee_times")
        .select(
          `
          *,
          users!tee_times_creator_id_fkey (first_name, last_name)
        `,
        )
        .eq("creator_id", userId)
        .gte("tee_date", new Date().toISOString().split("T")[0])
        .in("status", upcomingStatuses)
        .order("tee_date", { ascending: true })
        .order("tee_time", { ascending: true });

      if (creatorError) throw creatorError;

      invitesLogger.debug("[SCHEDULE] Fetched creator tee times", {
        event: "schedule_creator_tee_times",
        userId,
        count: (creatorTeeTimes || []).length,
      });

      // Get tee times where user is participant (can't filter by foreign table date in Supabase)
      // Include participants with status: null, confirmed, or any status except cancelled
      const { data: participantTeeTimes, error: participantError } =
        await supabaseAdmin
          .from("tee_time_participants")
          .select(
            `
          tee_time_id,
          status,
          tee_times!inner (
            *,
            users!tee_times_creator_id_fkey (first_name, last_name)
          )
        `,
          )
          .eq("user_id", userId)
          .or("status.is.null,status.eq.confirmed,status.neq.cancelled");

      if (participantError) {
        invitesLogger.error("[SCHEDULE] Error fetching participant tee times", {
          event: "schedule_participant_error",
          userId,
          error: participantError?.message,
        });
        throw participantError;
      }

      invitesLogger.info("[SCHEDULE] Fetched participant tee times", {
        event: "schedule_participant_tee_times",
        userId,
        count: (participantTeeTimes || []).length,
        participantStatuses: (participantTeeTimes || []).map(p => ({
          teeTimeId: p.tee_time_id,
          participantStatus: p.status,
          teeTimeStatus: p.tee_times?.status,
          teeDate: p.tee_times?.tee_date,
          teeTime: p.tee_times?.tee_time,
        })),
      });

      // Combine and deduplicate
      const teeTimeMap = new Map();
      const today = new Date().toISOString().split("T")[0];

      (creatorTeeTimes || []).forEach((tt) => {
        teeTimeMap.set(tt.id, tt);
      });

      // Filter participant tee times by date and status in JS
      (participantTeeTimes || []).forEach((p) => {
        if (
          p.tee_times &&
          !teeTimeMap.has(p.tee_times.id) &&
          p.tee_times.tee_date >= today &&
          upcomingStatuses.includes(p.tee_times.status)
        ) {
          teeTimeMap.set(p.tee_times.id, p.tee_times);
        }
      });

      // Get participant counts for all tee times
      const teeTimesWithCounts = await Promise.all(
        Array.from(teeTimeMap.values()).map(async (tt) => {
          const { count } = await supabaseAdmin
            .from("tee_time_participants")
            .select("*", { count: "exact", head: true })
            .eq("tee_time_id", tt.id)
            .or("status.is.null,status.eq.confirmed,status.neq.cancelled");

          const user = tt.users || {};
          delete tt.users;

          return {
            ...tt,
            creator_first_name: user.first_name,
            creator_last_name: user.last_name,
            participant_count: count || 0,
          };
        }),
      );

      // Sort by date and time, then limit
      const sorted = teeTimesWithCounts.sort((a, b) => {
        const dateCompare = a.tee_date.localeCompare(b.tee_date);
        if (dateCompare !== 0) return dateCompare;
        return a.tee_time.localeCompare(b.tee_time);
      });

      const result = sorted.slice(0, limit);
      
      invitesLogger.info("[SCHEDULE] Returning upcoming tee times", {
        event: "schedule_upcoming_result",
        userId,
        limit,
        resultCount: result.length,
        teeTimeIds: result.map(tt => tt.id),
      });

      return result;
    } catch (error) {
      handleError(error, "getUpcomingTeeTimes");
    }
  }

  async updateStatus(teeTimeId, status) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_times")
        .update({ status })
        .eq("id", teeTimeId)
        .select()
        .single();

      if (error) throw error;

      // When tee time is confirmed, automatically create group chat and add all participants
      if (status === "confirmed") {
        try {
          const conversationRepository = require("./conversationRepository");
          await conversationRepository.createTeeTimeConversationWithParticipants(teeTimeId);
          logger.info(`Created group chat for confirmed tee time ${teeTimeId}`);
        } catch (chatError) {
          // Don't fail status update if chat creation fails
          logger.error(`Failed to create group chat for tee time ${teeTimeId}:`, chatError.message);
        }
      }

      return data;
    } catch (error) {
      handleError(error, "updateStatus");
    }
  }

  async addParticipant(
    teeTimeId,
    userId,
    phone,
    name,
    position,
    isCreator = false,
  ) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_time_participants")
        .upsert(
          {
            tee_time_id: teeTimeId,
            user_id: userId,
            phone,
            name,
            position,
            is_creator: isCreator,
          },
          {
            onConflict: "tee_time_id,user_id",
            ignoreDuplicates: true,
          },
        )
        .select()
        .single();

      if (error && error.code !== "23505") throw error;

      // If tee time is confirmed, keep group chat in sync with current participants (add new, remove cancelled)
      if (userId && !phone) {
        try {
          const { data: teeTime } = await supabaseAdmin
            .from("tee_times")
            .select("status")
            .eq("id", teeTimeId)
            .single();

          if (teeTime && teeTime.status === "confirmed") {
            const conversationRepository = require("./conversationRepository");
            const conv = await conversationRepository.getOrCreateTeeTimeConversation(userId, teeTimeId);
            await conversationRepository.ensureParticipant(conv.id, userId);
            await conversationRepository.syncTeeTimeConversationParticipants(teeTimeId);
            logger.info(`Added participant ${userId} to conversation for confirmed tee time ${teeTimeId}`);
          }
        } catch (chatError) {
          logger.error(`Failed to add participant to conversation for tee time ${teeTimeId}:`, chatError.message);
        }
      }

      return data || null;
    } catch (error) {
      handleError(error, "addParticipant");
    }
  }

  async getParticipants(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_time_participants")
        .select(
          `
          *,
          users!tee_time_participants_user_id_fkey (
            first_name, 
            last_name, 
            username,
            user_profiles (avatar_url, handicap)
          )
        `,
        )
        .eq("tee_time_id", teeTimeId)
        .or("status.is.null,status.neq.cancelled")
        .order("position", { ascending: true });

      if (error) throw error;

      return (data || []).map((p) => {
        const user = p.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete p.users;

        return {
          ...p,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
        };
      });
    } catch (error) {
      handleError(error, "getParticipants");
    }
  }

  /** Users who left after joining (detail API only; excluded from active participant queries). */
  async getCancelledParticipants(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_time_participants")
        .select(
          `
          *,
          users!tee_time_participants_user_id_fkey (
            first_name,
            last_name,
            username,
            user_profiles (avatar_url, handicap)
          )
        `,
        )
        .eq("tee_time_id", teeTimeId)
        .eq("status", "cancelled")
        .order("cancelled_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((p) => {
        const user = p.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete p.users;

        return {
          ...p,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
        };
      });
    } catch (error) {
      handleError(error, "getCancelledParticipants");
    }
  }

  /**
   * Batch fetch participants for multiple tee times (N+1 fix)
   * @param {string[]} teeTimeIds - Array of tee time IDs
   * @returns {Object} Map of teeTimeId -> participants[]
   */
  async getParticipantsBatch(teeTimeIds) {
    if (!teeTimeIds || teeTimeIds.length === 0) {
      return {};
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("tee_time_participants")
        .select(
          `
          *,
          users!tee_time_participants_user_id_fkey (
            first_name, 
            last_name, 
            username,
            user_profiles (avatar_url, handicap)
          )
        `,
        )
        .in("tee_time_id", teeTimeIds)
        .or("status.is.null,status.neq.cancelled")
        .order("position", { ascending: true });

      if (error) throw error;

      // Group participants by tee_time_id
      const participantsByTeeTime = {};
      teeTimeIds.forEach((id) => {
        participantsByTeeTime[id] = [];
      });

      (data || []).forEach((p) => {
        const user = p.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        const teeTimeId = p.tee_time_id;
        delete p.users;

        participantsByTeeTime[teeTimeId].push({
          ...p,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: profile.avatar_url,
          user_handicap: profile.handicap,
        });
      });

      return participantsByTeeTime;
    } catch (error) {
      handleError(error, "getParticipantsBatch");
    }
  }

  async removeParticipant(teeTimeId, participantId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_time_participants")
        .delete()
        .eq("tee_time_id", teeTimeId)
        .eq("id", participantId)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "removeParticipant");
    }
  }

  async getParticipantCount(teeTimeId) {
    try {
      // Count only active participants (exclude cancelled)
      const { count, error } = await supabaseAdmin
        .from("tee_time_participants")
        .select("*", { count: "exact", head: true })
        .eq("tee_time_id", teeTimeId)
        .or("status.is.null,status.eq.confirmed,status.neq.cancelled");

      if (error) throw error;
      return count || 0;
    } catch (error) {
      handleError(error, "getParticipantCount");
    }
  }

  async getParticipantByUser(teeTimeId, userId) {
    try {
      // Check for active participants only (exclude cancelled)
      const { data, error } = await supabaseAdmin
        .from("tee_time_participants")
        .select("*")
        .eq("tee_time_id", teeTimeId)
        .eq("user_id", userId)
        .or("status.is.null,status.eq.confirmed,status.neq.cancelled")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "getParticipantByUser");
    }
  }

  async cancelTeeTime(teeTimeId, userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_times")
        .update({ status: "cancelled" })
        .eq("id", teeTimeId)
        .eq("creator_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "cancelTeeTime");
    }
  }

  async getTeeTimesByDateRange(userId, startDate, endDate) {
    try {
      // 1. Get tee times created by user
      const { data: creatorData, error: creatorError } = await supabaseAdmin
        .from("tee_times")
        .select("*")
        .eq("creator_id", userId)
        .gte("tee_date", startDate)
        .lte("tee_date", endDate);

      if (creatorError) throw creatorError;

      // 2. Get tee times where user is a participant
      // Note: Filtering on joined table columns requires !inner join usually, but we need date filter too
      // PostgREST filtering on embedded resource valid, e.g. tee_times.tee_date
      const { data: participantData, error: participantError } =
        await supabaseAdmin
          .from("tee_time_participants")
          .select(
            `
          tee_times!inner (*)
        `,
          )
          .eq("user_id", userId)
          .or("status.is.null,status.eq.confirmed,status.neq.cancelled")
          .gte("tee_times.tee_date", startDate)
          .lte("tee_times.tee_date", endDate);

      if (participantError) throw participantError;

      // Merge and deduplicate
      const teeTimeMap = new Map();

      (creatorData || []).forEach((tt) => teeTimeMap.set(tt.id, tt));

      (participantData || []).forEach((p) => {
        if (p.tee_times) {
          teeTimeMap.set(p.tee_times.id, p.tee_times);
        }
      });

      const teeTimes = Array.from(teeTimeMap.values());

      const teeTimesWithCounts = await Promise.all(
        teeTimes.map(async (tt) => {
          const { count } = await supabaseAdmin
            .from("tee_time_participants")
            .select("*", { count: "exact", head: true })
            .eq("tee_time_id", tt.id)
            .or("status.is.null,status.eq.confirmed,status.neq.cancelled");

          return { ...tt, participant_count: count || 0 };
        }),
      );

      return teeTimesWithCounts.sort((a, b) =>
        (a.tee_date || "").localeCompare(b.tee_date || ""),
      );
    } catch (error) {
      handleError(error, "getTeeTimesByDateRange");
    }
  }

  async removeParticipantByUser(teeTimeId, userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_time_participants")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("tee_time_id", teeTimeId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      const inviteRepository = require("./inviteRepository");
      await inviteRepository.markInvitesCancelledForLeavingUser(teeTimeId, userId);

      const conversationRepository = require("./conversationRepository");
      await conversationRepository.syncTeeTimeConversationParticipants(teeTimeId);
      return data;
    } catch (error) {
      handleError(error, "removeParticipantByUser");
    }
  }

  async getTeeTimesInRange(startTime, endTime, statuses = ["confirmed"]) {
    try {
      // Note: Date + time comparison needs PostgreSQL function
      const { data, error } = await supabaseAdmin
        .from("tee_times")
        .select("*")
        .in("status", statuses)
        .gte("tee_date", startTime)
        .lte("tee_date", endTime);

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getTeeTimesInRange");
    }
  }

  async getInProgressTeeTimes(cutoffTime) {
    try {
      const { data, error } = await supabaseAdmin
        .from("tee_times")
        .select("*")
        .eq("status", "in_progress")
        .is("check_in_completed_at", null)
        .lt("tee_date", cutoffTime);

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getInProgressTeeTimes");
    }
  }

  async getTeeTimeHistory(userId, options = {}) {
    const { filter = "all", limit = 20, offset = 0 } = options;

    try {
      // Fetch as creator and as participant in two queries to avoid PostgREST .or() on relations
      const today = new Date().toISOString().split("T")[0];
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);

      const selectFields = `
          id, course_name, course_location, tee_date, tee_time, status,
          creator_id, max_players,
          users!tee_times_creator_id_fkey (first_name, last_name, user_profiles (avatar_url)),
          tee_time_participants!left (user_id, status),
          tee_time_attendance!left (status),
          game_scores!left (score, holes_played)
        `;

      const creatorRes = await supabaseAdmin
        .from("tee_times")
        .select(selectFields)
        .eq("creator_id", userId);

      if (creatorRes.error) throw creatorRes.error;

      const { data: participantRows } = await supabaseAdmin
        .from("tee_time_participants")
        .select("tee_time_id")
        .eq("user_id", userId);

      const participantTeeTimeIds = [...new Set((participantRows || []).map((r) => r.tee_time_id).filter(Boolean))];
      let participantRes = { data: [] };
      if (participantTeeTimeIds.length > 0) {
        participantRes = await supabaseAdmin
          .from("tee_times")
          .select(selectFields)
          .in("id", participantTeeTimeIds);
        if (participantRes.error) throw participantRes.error;
      }

      const byId = new Map();
      for (const tt of creatorRes.data || []) {
        byId.set(tt.id, tt);
      }
      for (const tt of participantRes.data || []) {
        if (!byId.has(tt.id)) byId.set(tt.id, tt);
      }

      let list = Array.from(byId.values());

      if (filter === "upcoming") {
        list = list.filter(
          (tt) => tt.tee_date >= today && !["cancelled", "completed"].includes(tt.status)
        );
      } else if (filter === "completed") {
        list = list.filter((tt) => tt.status === "completed");
      } else if (filter === "cancelled") {
        list = list.filter((tt) => tt.status === "cancelled");
      }

      list.sort((a, b) => {
        const d = (b.tee_date || "").localeCompare(a.tee_date || "");
        if (d !== 0) return d;
        return (b.tee_time || "").localeCompare(a.tee_time || "");
      });

      const paginated = list.slice(offsetNum, offsetNum + limitNum);

      return paginated.map((tt) => {
        const user = tt.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData) ? profileData[0] || {} : profileData || {};
        const participant = tt.tee_time_participants?.[0] || {};
        const attendance = tt.tee_time_attendance?.[0] || {};
        const gameScore = tt.game_scores?.[0] || {};
        const participants = tt.tee_time_participants || [];

        return {
          id: tt.id,
          course_name: tt.course_name,
          course_location: tt.course_location,
          tee_date: tt.tee_date,
          tee_time: tt.tee_time,
          tee_time_status: tt.status,
          creator_id: tt.creator_id,
          max_players: tt.max_players,
          creator_first_name: user.first_name,
          creator_last_name: user.last_name,
          creator_avatar: profile.avatar_url,
          participant_status: participant.status,
          attendance_status: attendance.status,
          game_score: gameScore.score,
          holes_played: gameScore.holes_played,
          participant_count: participants.length,
          user_role: tt.creator_id === userId ? "organizer" : "participant",
        };
      });
    } catch (error) {
      logger.error("getTeeTimeHistory error", error);
      return [];
    }
  }

  /**
   * Search user's tee times by course name (for global search, Figma 795-*)
   */
  async searchTeeTimes(userId, query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) return [];
      const today = new Date().toISOString().split("T")[0];
      const pattern = `%${query.trim()}%`;

      const { data: asCreator } = await supabaseAdmin
        .from("tee_times")
        .select("id, course_name, course_location, tee_date, tee_time, status, max_players")
        .eq("creator_id", userId)
        .ilike("course_name", pattern)
        .gte("tee_date", today)
        .in("status", ["pending", "confirmed"])
        .order("tee_date", { ascending: true })
        .limit(limit);

      const { data: asParticipant } = await supabaseAdmin
        .from("tee_time_participants")
        .select("tee_times!inner(id, course_name, course_location, tee_date, tee_time, status, max_players)")
        .eq("user_id", userId)
        .or("status.is.null,status.eq.confirmed,status.neq.cancelled")
        .limit(limit * 2);

      const participantTeeTimes = (asParticipant || [])
        .map((p) => (Array.isArray(p.tee_times) ? p.tee_times[0] : p.tee_times))
        .filter((tt) => tt && tt.tee_date >= today && ["pending", "confirmed"].includes(tt.status));

      const seen = new Set((asCreator || []).map((t) => t.id));
      const merged = [...(asCreator || [])];
      for (const tt of participantTeeTimes) {
        if (!seen.has(tt.id)) {
          seen.add(tt.id);
          merged.push(tt);
        }
      }
      merged.sort((a, b) => (a.tee_date || "").localeCompare(b.tee_date || "") || (a.tee_time || "").localeCompare(b.tee_time || ""));
      return merged.slice(0, limit);
    } catch (error) {
      handleError(error, "searchTeeTimes");
      return [];
    }
  }

  async markPastTeeTimesCompleted() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabaseAdmin
        .from("tee_times")
        .update({ status: "completed" })
        .in("status", ["pending", "confirmed"])
        .lt("tee_date", today)
        .select("id, tee_date, tee_time, status, creator_id");

      if (error) throw error;
      
      // Apply automatic no-show penalties for participants who didn't check in
      if (data && data.length > 0) {
        const attendanceService = require("../services/attendanceService");
        for (const teeTime of data) {
          try {
            await attendanceService.applyAutomaticNoShowPenalties(teeTime.id, teeTime.creator_id);
          } catch (penaltyError) {
            // Log but don't fail the entire operation
            logger.error(`Error applying automatic no-show penalties for tee time ${teeTime.id}:`, penaltyError.message);
          }
        }
      }
      
      return data || [];
    } catch (error) {
      handleError(error, "markPastTeeTimesCompleted");
    }
  }

  async checkAndUpdateStatus(teeTimeId) {
    const teeTime = await this.getTeeTimeById(teeTimeId);
    if (
      !teeTime ||
      teeTime.status === "completed" ||
      teeTime.status === "cancelled"
    ) {
      return null;
    }

    const teeDateTime = createTeeDateTime(teeTime.tee_date, teeTime.tee_time);
    if (teeDateTime < new Date()) {
      return this.updateStatus(teeTimeId, "completed");
    }

    const inviteType = teeTime.invite_type || "roster";
    const maxPlayers = teeTime.max_players || 4;

    try {
      // FCFS / open / manual (parallel): confirm when group is full
      if (inviteType === "fcfs" || inviteType === "open" || inviteType === "manual") {
        const participantCount = await this.getParticipantCount(teeTimeId);
        if (participantCount >= maxPlayers) {
          logger.info(`FCFS/open tee time ${teeTimeId} full (${participantCount}/${maxPlayers}), setting status to confirmed`);
          return this.updateStatus(teeTimeId, "confirmed");
        }
        return null;
      }

      // Roster: confirm when no pending invites and at least one accepted
      const { data: invites, error } = await supabaseAdmin
        .from("invites")
        .select("status")
        .eq("tee_time_id", teeTimeId);

      if (error) throw error;

      const pendingCount = invites.filter((i) => i.status === "pending").length;
      const acceptedCount = invites.filter(
        (i) => i.status === "accepted",
      ).length;

      if (pendingCount === 0 && acceptedCount > 0) {
        return this.updateStatus(teeTimeId, "confirmed");
      }

      return null;
    } catch (error) {
      handleError(error, "checkAndUpdateStatus");
    }
  }

  /**
   * Get Open invites (community board) filtered by distance, date, time, and course
   * @param {string} userId - Current user ID
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @param {number} maxDistance - Maximum distance in miles (optional filter)
   * @param {string} filterDate - Filter by specific date (YYYY-MM-DD) (optional)
   * @param {string} filterTime - Filter by time range (e.g., "morning", "afternoon") (optional)
   * @param {string} filterCourse - Filter by course name (partial match) (optional)
   */
  async getOpenInvites(userId, userLat, userLng, maxDistance = null, filterDate = null, filterTime = null, filterCourse = null) {
    try {
      // Build query for open tee times
      let query = supabaseAdmin
        .from("tee_times")
        .select(`
          *,
          users!tee_times_creator_id_fkey (
            first_name,
            last_name,
            username,
            user_profiles (avatar_url, handicap, social_rate)
          ),
          tee_time_participants (
            user_id,
            users!tee_time_participants_user_id_fkey (
              first_name,
              last_name,
              user_profiles (avatar_url, handicap, social_rate)
            )
          )
        `)
        .eq("invite_type", "open")
        .in("status", ["pending", "confirmed"])
        .gte("tee_date", new Date().toISOString().split("T")[0]);

      // Apply date filter
      if (filterDate) {
        query = query.eq("tee_date", filterDate);
      }

      // Apply course filter
      if (filterCourse) {
        query = query.ilike("course_name", `%${filterCourse}%`);
      }

      query = query.order("tee_date", { ascending: true })
        .order("tee_time", { ascending: true });

      const { data: openTeeTimes, error } = await query;

      if (error) throw error;

      // Calculate distance for each tee time
      const teeTimesWithDistance = await Promise.all(
        (openTeeTimes || []).map(async (tt) => {
          // Extract distance radius from notes (stored as JSON)
          let distanceRadius = 20; // Default
          try {
            if (tt.notes) {
              const notesData = JSON.parse(tt.notes);
              if (notesData.distanceRadius) {
                distanceRadius = notesData.distanceRadius;
              }
            }
          } catch (e) {
            // Notes not JSON or doesn't contain distanceRadius
          }

          // Get course coordinates if course_id exists
          let distance = null;
          if (tt.course_id && userLat && userLng) {
            try {
              const course = await courseRepository.getCourseById(tt.course_id);
              if (course && course.latitude && course.longitude) {
                // Calculate distance using Haversine formula
                const R = 3959; // Earth radius in miles
                const dLat = (course.latitude - userLat) * Math.PI / 180;
                const dLon = (course.longitude - userLng) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(userLat * Math.PI / 180) * Math.cos(course.latitude * Math.PI / 180) *
                         Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                distance = R * c;
              }
            } catch (e) {
              logger.warn(`Failed to get course ${tt.course_id} for distance calculation`, e);
            }
          }

          // Filter by maxDistance if provided
          if (maxDistance !== null && distance !== null && distance > maxDistance) {
            return null;
          }

          // Filter by tee time's distance radius
          if (distance !== null && distance > distanceRadius) {
            return null;
          }

          // Apply time filter (morning: 5-12, afternoon: 12-17, evening: 17-22)
          if (filterTime) {
            const [hours] = tt.tee_time.split(':').map(Number);
            const hour24 = hours;
            
            if (filterTime === "morning" && (hour24 < 5 || hour24 >= 12)) {
              return null;
            } else if (filterTime === "afternoon" && (hour24 < 12 || hour24 >= 17)) {
              return null;
            } else if (filterTime === "evening" && (hour24 < 17 || hour24 >= 22)) {
              return null;
            }
          }

          const creator = tt.users || {};
          const creatorProfile = Array.isArray(creator.user_profiles) 
            ? creator.user_profiles[0] || {}
            : creator.user_profiles || {};

          const participants = (tt.tee_time_participants || []).map(p => {
            const participantUser = p.users || {};
            const participantProfile = Array.isArray(participantUser.user_profiles)
              ? participantUser.user_profiles[0] || {}
              : participantUser.user_profiles || {};

            return {
              userId: p.user_id,
              firstName: participantUser.first_name,
              lastName: participantUser.last_name,
              avatar: participantProfile.avatar_url,
              handicap: participantProfile.handicap,
              socialRate: participantProfile.social_rate,
            };
          });

          return {
            id: tt.id,
            courseName: tt.course_name,
            courseLocation: tt.course_location,
            courseId: tt.course_id,
            teeDate: tt.tee_date,
            teeTime: tt.tee_time,
            maxPlayers: tt.max_players,
            status: tt.status,
            distanceRadius,
            distance,
            creator: {
              id: tt.creator_id,
              firstName: creator.first_name,
              lastName: creator.last_name,
              username: creator.username,
              avatar: creatorProfile.avatar_url,
            },
            participants,
            participantCount: participants.length,
            slotsOpen: tt.max_players - participants.length,
          };
        })
      );

      // Filter out nulls (filtered by distance)
      return teeTimesWithDistance.filter(tt => tt !== null);
    } catch (error) {
      handleError(error, "getOpenInvites");
    }
  }
}

module.exports = new TeeTimeRepository();

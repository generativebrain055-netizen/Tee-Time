const { supabaseAdmin, handleError } = require("../config/supabase");
const logger = require("../config/logger");
const { createTeeDateTime } = require("../utils/dateUtils");

class TeeTimeRepository {
  async createTeeTime(creatorId, teeTimeData) {
    const {
      courseName,
      courseLocation,
      teeDate,
      teeTime,
      maxPlayers,
      inviteType,
      notes,
    } = teeTimeData;

    try {
      const { data: teeTimeRecord, error } = await supabaseAdmin
        .from("tee_times")
        .insert({
          creator_id: creatorId,
          course_name: courseName,
          course_location: courseLocation,
          tee_date: teeDate,
          tee_time: teeTime,
          max_players: maxPlayers || 4,
          invite_type: inviteType || "roster",
          notes,
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
        true
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
        `
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
        `
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
      let participantQuery = supabaseAdmin
        .from("tee_time_participants")
        .select(
          `
          tee_time_id,
          tee_times!inner (
            *,
            users!tee_times_creator_id_fkey (first_name, last_name)
          )
        `
        )
        .eq("user_id", userId)
        .or("status.is.null,status.neq.cancelled");

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
            .or("status.is.null,status.neq.cancelled");

          const user = tt.users || {};
          delete tt.users;

          return {
            ...tt,
            creator_first_name: user.first_name,
            creator_last_name: user.last_name,
            participant_count: count || 0,
          };
        })
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
      // Get tee times where user is creator
      const { data: creatorTeeTimes, error: creatorError } = await supabaseAdmin
        .from("tee_times")
        .select(
          `
          *,
          users!tee_times_creator_id_fkey (first_name, last_name)
        `
        )
        .eq("creator_id", userId)
        .gte("tee_date", new Date().toISOString().split("T")[0])
        .in("status", ["pending", "confirmed"])
        .order("tee_date", { ascending: true })
        .order("tee_time", { ascending: true });

      if (creatorError) throw creatorError;

      // Get tee times where user is participant (can't filter by foreign table date in Supabase)
      const { data: participantTeeTimes, error: participantError } =
        await supabaseAdmin
          .from("tee_time_participants")
          .select(
            `
          tee_time_id,
          tee_times!inner (
            *,
            users!tee_times_creator_id_fkey (first_name, last_name)
          )
        `
          )
          .eq("user_id", userId)
          .or("status.is.null,status.neq.cancelled");

      if (participantError) throw participantError;

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
          ["pending", "confirmed"].includes(p.tee_times.status)
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
            .or("status.is.null,status.neq.cancelled");

          const user = tt.users || {};
          delete tt.users;

          return {
            ...tt,
            creator_first_name: user.first_name,
            creator_last_name: user.last_name,
            participant_count: count || 0,
          };
        })
      );

      // Sort by date and time, then limit
      const sorted = teeTimesWithCounts.sort((a, b) => {
        const dateCompare = a.tee_date.localeCompare(b.tee_date);
        if (dateCompare !== 0) return dateCompare;
        return a.tee_time.localeCompare(b.tee_time);
      });

      return sorted.slice(0, limit);
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
    isCreator = false
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
          }
        )
        .select()
        .single();

      if (error && error.code !== "23505") throw error;
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
        `
        )
        .eq("tee_time_id", teeTimeId)
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
      const { count, error } = await supabaseAdmin
        .from("tee_time_participants")
        .select("*", { count: "exact", head: true })
        .eq("tee_time_id", teeTimeId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      handleError(error, "getParticipantCount");
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
        `
          )
          .eq("user_id", userId)
          .or("status.is.null,status.neq.cancelled")
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
            .or("status.is.null,status.neq.cancelled");

          return { ...tt, participant_count: count || 0 };
        })
      );

      return teeTimesWithCounts.sort((a, b) =>
        (a.tee_date || "").localeCompare(b.tee_date || "")
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
      let query = supabaseAdmin
        .from("tee_times")
        .select(
          `
          id, course_name, course_location, tee_date, tee_time, status,
          creator_id, max_players,
          users!inner (first_name, last_name),
          user_profiles (avatar_url),
          tee_time_participants!left (user_id, status),
          tee_time_attendance!left (status),
          game_scores!left (score, holes_played)
        `
        )
        .or(
          `creator_id.eq.${userId},tee_time_participants.user_id.eq.${userId}`
        );

      if (filter === "upcoming") {
        query = query
          .gte("tee_date", new Date().toISOString().split("T")[0])
          .not("status", "in", "('cancelled','completed')");
      } else if (filter === "completed") {
        query = query.eq("status", "completed");
      } else if (filter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      query = query
        .order("tee_date", { ascending: false })
        .order("tee_time", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((tt) => {
        const user = tt.users || {};
        const profile = tt.user_profiles?.[0] || {};
        const participant = tt.tee_time_participants?.[0] || {};
        const attendance = tt.tee_time_attendance?.[0] || {};
        const gameScore = tt.game_scores?.[0] || {};

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
          user_role: tt.creator_id === userId ? "organizer" : "participant",
        };
      });
    } catch (error) {
      handleError(error, "getTeeTimeHistory");
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
        .select("id, tee_date, tee_time, status");

      if (error) throw error;
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

    try {
      const { data: invites, error } = await supabaseAdmin
        .from("invites")
        .select("status")
        .eq("tee_time_id", teeTimeId);

      if (error) throw error;

      const pendingCount = invites.filter((i) => i.status === "pending").length;
      const acceptedCount = invites.filter(
        (i) => i.status === "accepted"
      ).length;

      if (pendingCount === 0 && acceptedCount > 0) {
        return this.updateStatus(teeTimeId, "confirmed");
      }

      return null;
    } catch (error) {
      handleError(error, "checkAndUpdateStatus");
    }
  }
}

module.exports = new TeeTimeRepository();

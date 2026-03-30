const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

/**
 * Social score rules (clamped 0–200 in adjustScore):
 * - Baseline: 100
 * - Accept invite: +2
 * - Decline: -1 if declined more than 24h after invite was sent (spec: decline >24hr)
 * - Cancel participation within 24h of tee: -5 (spec: cancel <24hr)
 * - No-show: -10
 */
const POINT_VALUES = {
  INVITE_ACCEPTED: 2,
  INVITE_DECLINED_LATE: -1,
  CANCELLATION_LATE: -5,
  NO_SHOW: -10,
  INITIAL_SCORE: 100
};

// Reason codes for logging
const REASONS = {
  INVITE_ACCEPTED: 'invite_accepted',
  INVITE_DECLINED_LATE: 'invite_declined_late',
  CANCELLATION_LATE: 'cancellation_late',
  CANCELLATION_CONFIRMED: 'cancellation_confirmed', // legacy rows only; no longer written
  NO_SHOW: 'no_show',
  INITIAL_SCORE: 'initial_score',
  ADMIN_ADJUSTMENT: 'admin_adjustment'
};

class SocialRateService {
  constructor() {
    this.POINT_VALUES = POINT_VALUES;
    this.REASONS = REASONS;
  }

  /**
   * Get user's current social rate score
   */
  async getCurrentScore(userId) {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("social_rate")
      .eq("user_id", userId)
      .single();

    if (error) {
      logger.error(`Error getting social rate for user ${userId}:`, error.message);
      return null;
    }

    return data?.social_rate ?? null;
  }

  /**
   * Initialize score for new user (100 points)
   */
  async initializeScore(userId) {
    const currentScore = await this.getCurrentScore(userId);
    if (currentScore !== null) return currentScore;

    await this.logScoreChange({
      userId,
      previousScore: 0,
      delta: POINT_VALUES.INITIAL_SCORE,
      newScore: POINT_VALUES.INITIAL_SCORE,
      reason: REASONS.INITIAL_SCORE,
      reasonDetails: 'Initial score for new user'
    });

    await this.updateUserScore(userId, POINT_VALUES.INITIAL_SCORE);
    return POINT_VALUES.INITIAL_SCORE;
  }

  /**
   * Apply bonus for accepting an invite (+2 points)
   */
  async applyAcceptBonus(userId, teeTimeId, inviteId) {
    // Check idempotency - prevent duplicate bonuses
    const existing = await this.findLogEntry(userId, inviteId, REASONS.INVITE_ACCEPTED);
    if (existing) {
      logger.info(`Accept bonus already applied for user ${userId}, invite ${inviteId}`);
      return existing.new_score;
    }

    return this.adjustScore(userId, POINT_VALUES.INVITE_ACCEPTED, {
      reason: REASONS.INVITE_ACCEPTED,
      teeTimeId,
      inviteId,
      reasonDetails: 'Accepted tee time invite'
    });
  }

  /**
   * Decline penalty: -1 if the user declines more than 24 hours after the invite was created.
   */
  async applyLateDeclinePenalty(userId, teeTimeId, inviteId, inviteCreatedAt) {
    const hoursSinceInvite = this.hoursBetween(new Date(inviteCreatedAt), new Date());

    if (hoursSinceInvite <= 24) {
      logger.info(`No decline penalty — within 24h of invite (${hoursSinceInvite.toFixed(1)}h)`);
      return null;
    }

    const existing = await this.findLogEntry(userId, inviteId, REASONS.INVITE_DECLINED_LATE);
    if (existing) {
      logger.info(`Decline penalty already applied for user ${userId}, invite ${inviteId}`);
      return existing.new_score;
    }

    return this.adjustScore(userId, POINT_VALUES.INVITE_DECLINED_LATE, {
      reason: REASONS.INVITE_DECLINED_LATE,
      teeTimeId,
      inviteId,
      reasonDetails: `Declined ${Math.floor(hoursSinceInvite)}h after invite received`
    });
  }

  /**
   * Apply penalty for late cancellation (-5 points if within 24h of tee time)
   */
  async applyLateCancellationPenalty(userId, teeTimeId, teeDateTime) {
    const hoursUntilTeeTime = this.hoursBetween(new Date(), new Date(teeDateTime));

    // Only penalize if within 24 hours of tee time
    if (hoursUntilTeeTime > 24) {
      logger.info(`No penalty for cancellation - more than 24h before tee time (${hoursUntilTeeTime.toFixed(1)}h)`);
      return null;
    }

    // Check idempotency using tee_time_id + reason
    const existing = await this.findLogEntryByTeeTime(userId, teeTimeId, REASONS.CANCELLATION_LATE);
    if (existing) {
      logger.info(`Late cancellation penalty already applied for user ${userId}, tee time ${teeTimeId}`);
      return existing.new_score;
    }

    return this.adjustScore(userId, POINT_VALUES.CANCELLATION_LATE, {
      reason: REASONS.CANCELLATION_LATE,
      teeTimeId,
      reasonDetails: `Cancelled ${Math.abs(Math.floor(hoursUntilTeeTime))}h before tee time`
    });
  }

  /**
   * Apply no-show penalty (-10 points)
   */
  async applyNoShowPenalty(userId, teeTimeId, markedBy) {
    // Check idempotency
    const existing = await this.findLogEntryByTeeTime(userId, teeTimeId, REASONS.NO_SHOW);
    if (existing) {
      logger.info(`No-show penalty already applied for user ${userId}, tee time ${teeTimeId}`);
      return existing;
    }

    const newScore = await this.adjustScore(userId, POINT_VALUES.NO_SHOW, {
      reason: REASONS.NO_SHOW,
      teeTimeId,
      triggeredBy: markedBy,
      reasonDetails: 'Marked as no-show by organizer'
    });

    // Return the log entry for reference
    return this.findLogEntryByTeeTime(userId, teeTimeId, REASONS.NO_SHOW);
  }

  /**
   * Core score adjustment method
   */
  async adjustScore(userId, delta, options = {}) {
    const currentScore = await this.getCurrentScore(userId) ?? POINT_VALUES.INITIAL_SCORE;
    const newScore = Math.max(0, Math.min(200, currentScore + delta)); // Cap between 0-200

    await this.logScoreChange({
      userId,
      previousScore: currentScore,
      delta,
      newScore,
      ...options
    });

    await this.updateUserScore(userId, newScore);
    
    logger.info(`Social rate adjusted for user ${userId}: ${currentScore} -> ${newScore} (${delta > 0 ? '+' : ''}${delta})`);
    return newScore;
  }

  /**
   * Log score change (immutable record)
   */
  async logScoreChange(data) {
    const { data: log, error } = await supabaseAdmin
      .from("social_rate_logs")
      .insert({
        user_id: data.userId,
        tee_time_id: data.teeTimeId || null,
        invite_id: data.inviteId || null,
        previous_score: data.previousScore,
        delta: data.delta,
        new_score: data.newScore,
        reason: data.reason,
        reason_details: data.reasonDetails || null,
        triggered_by: data.triggeredBy || null,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error logging score change:", error.message);
      throw error;
    }

    return log;
  }

  /**
   * Update user's score in profile
   */
  async updateUserScore(userId, newScore) {
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({ 
        social_rate: newScore,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (error) {
      logger.error(`Error updating social rate for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Find existing log entry by invite (for idempotency)
   */
  async findLogEntry(userId, inviteId, reason) {
    const { data, error } = await supabaseAdmin
      .from("social_rate_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("invite_id", inviteId)
      .eq("reason", reason)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error("Error finding log entry:", error.message);
    }

    return data || null;
  }

  /**
   * Find existing log entry by tee time (for idempotency)
   */
  async findLogEntryByTeeTime(userId, teeTimeId, reason) {
    const { data, error } = await supabaseAdmin
      .from("social_rate_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("tee_time_id", teeTimeId)
      .eq("reason", reason)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error("Error finding log entry by tee time:", error.message);
    }

    return data || null;
  }

  /**
   * Get user's score history
   */
  async getScoreHistory(userId, limit = 50, offset = 0) {
    const { data, error } = await supabaseAdmin
      .from("social_rate_logs")
      .select(`
        *,
        tee_times:tee_time_id (
          course_name,
          tee_date,
          tee_time
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error("Error getting score history:", error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's social rate summary
   */
  async getSummary(userId) {
    // Get current score
    const currentScore = await this.getCurrentScore(userId) ?? 100;

    // Get all logs for aggregation
    const { data: logs, error } = await supabaseAdmin
      .from("social_rate_logs")
      .select("reason, delta")
      .eq("user_id", userId);

    if (error) {
      logger.error("Error getting summary:", error.message);
      return {
        current_score: currentScore,
        total_accepts: 0,
        total_late_declines: 0,
        total_late_cancellations: 0,
        total_no_shows: 0,
        total_earned: 0,
        total_lost: 0
      };
    }

    const summary = {
      current_score: currentScore,
      total_accepts: logs.filter(l => l.reason === 'invite_accepted').length,
      total_late_declines: logs.filter(l => l.reason === 'invite_declined_late').length,
      total_late_cancellations: logs.filter(l => l.reason === 'cancellation_late').length,
      total_no_shows: logs.filter(l => l.reason === 'no_show').length,
      total_earned: logs.filter(l => l.delta > 0).reduce((sum, l) => sum + l.delta, 0),
      total_lost: Math.abs(logs.filter(l => l.delta < 0).reduce((sum, l) => sum + l.delta, 0))
    };

    return summary;
  }

  /**
   * Helper: Calculate hours between two dates
   */
  hoursBetween(startDate, endDate) {
    return (endDate - startDate) / (1000 * 60 * 60);
  }
}

module.exports = new SocialRateService();

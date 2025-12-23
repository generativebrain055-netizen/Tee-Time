const { pool } = require("../config/database");
const logger = require("../config/logger");

// Point values for different actions
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
    const query = `
      SELECT social_rate FROM user_profiles WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.social_rate ?? null;
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
   * Apply penalty for late decline (-1 point if > 24h after invite sent)
   */
  async applyLateDeclinePenalty(userId, teeTimeId, inviteId, inviteCreatedAt) {
    const hoursSinceInvite = this.hoursBetween(new Date(inviteCreatedAt), new Date());

    // Only penalize if > 24 hours since invite was sent
    if (hoursSinceInvite <= 24) {
      logger.info(`No penalty for decline - within 24h window (${hoursSinceInvite.toFixed(1)}h)`);
      return null;
    }

    // Check idempotency
    const existing = await this.findLogEntry(userId, inviteId, REASONS.INVITE_DECLINED_LATE);
    if (existing) {
      logger.info(`Late decline penalty already applied for user ${userId}, invite ${inviteId}`);
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
    const newScore = Math.max(0, currentScore + delta); // Floor at 0

    await this.logScoreChange({
      userId,
      previousScore: currentScore,
      delta,
      newScore,
      ...options
    });

    await this.updateUserScore(userId, newScore);
    
    logger.info(`Social rate adjusted for user ${userId}: ${currentScore} → ${newScore} (${delta > 0 ? '+' : ''}${delta})`);
    return newScore;
  }

  /**
   * Log score change (immutable record)
   */
  async logScoreChange(data) {
    const query = `
      INSERT INTO social_rate_logs 
        (user_id, tee_time_id, invite_id, previous_score, delta, new_score, reason, reason_details, triggered_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.userId,
      data.teeTimeId || null,
      data.inviteId || null,
      data.previousScore,
      data.delta,
      data.newScore,
      data.reason,
      data.reasonDetails || null,
      data.triggeredBy || null
    ]);
    return result.rows[0];
  }

  /**
   * Update user's score in profile
   */
  async updateUserScore(userId, newScore) {
    const query = `
      UPDATE user_profiles SET social_rate = $1, updated_at = NOW()
      WHERE user_id = $2
    `;
    await pool.query(query, [newScore, userId]);
  }

  /**
   * Find existing log entry by invite (for idempotency)
   */
  async findLogEntry(userId, inviteId, reason) {
    const query = `
      SELECT * FROM social_rate_logs 
      WHERE user_id = $1 AND invite_id = $2 AND reason = $3
      LIMIT 1
    `;
    const result = await pool.query(query, [userId, inviteId, reason]);
    return result.rows[0] || null;
  }

  /**
   * Find existing log entry by tee time (for idempotency)
   */
  async findLogEntryByTeeTime(userId, teeTimeId, reason) {
    const query = `
      SELECT * FROM social_rate_logs 
      WHERE user_id = $1 AND tee_time_id = $2 AND reason = $3
      LIMIT 1
    `;
    const result = await pool.query(query, [userId, teeTimeId, reason]);
    return result.rows[0] || null;
  }

  /**
   * Get user's score history
   */
  async getScoreHistory(userId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        srl.*,
        tt.course_name,
        tt.tee_date,
        tt.tee_time
      FROM social_rate_logs srl
      LEFT JOIN tee_times tt ON srl.tee_time_id = tt.id
      WHERE srl.user_id = $1
      ORDER BY srl.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get user's social rate summary
   */
  async getSummary(userId) {
    const query = `
      SELECT 
        COALESCE(up.social_rate, 100) as current_score,
        COUNT(srl.id) FILTER (WHERE srl.reason = 'invite_accepted') as total_accepts,
        COUNT(srl.id) FILTER (WHERE srl.reason = 'invite_declined_late') as total_late_declines,
        COUNT(srl.id) FILTER (WHERE srl.reason = 'cancellation_late') as total_late_cancellations,
        COUNT(srl.id) FILTER (WHERE srl.reason = 'no_show') as total_no_shows,
        COALESCE(SUM(srl.delta) FILTER (WHERE srl.delta > 0), 0) as total_earned,
        COALESCE(ABS(SUM(srl.delta) FILTER (WHERE srl.delta < 0)), 0) as total_lost
      FROM user_profiles up
      LEFT JOIN social_rate_logs srl ON up.user_id = srl.user_id
      WHERE up.user_id = $1
      GROUP BY up.social_rate
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || {
      current_score: 100,
      total_accepts: 0,
      total_late_declines: 0,
      total_late_cancellations: 0,
      total_no_shows: 0,
      total_earned: 0,
      total_lost: 0
    };
  }

  /**
   * Helper: Calculate hours between two dates
   */
  hoursBetween(startDate, endDate) {
    return (endDate - startDate) / (1000 * 60 * 60);
  }
}

module.exports = new SocialRateService();

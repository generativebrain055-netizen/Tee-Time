const { pool } = require("../config/database");
const logger = require("../config/logger");

class TeeTimeRepository {
  // Create a new tee time
  async createTeeTime(creatorId, teeTimeData) {
    const { courseName, courseLocation, teeDate, teeTime, maxPlayers, inviteType, notes } = teeTimeData;
    
    const query = `
      INSERT INTO tee_times (creator_id, course_name, course_location, tee_date, tee_time, max_players, invite_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [
      creatorId, courseName, courseLocation, teeDate, teeTime, maxPlayers || 4, inviteType || 'roster', notes
    ]);
    
    // Add creator as first participant
    await this.addParticipant(result.rows[0].id, creatorId, null, null, 0, true);
    
    return result.rows[0];
  }

  // Get tee time by ID
  async getTeeTimeById(teeTimeId) {
    const query = `
      SELECT t.*, u.first_name, u.last_name, u.username, p.avatar_url
      FROM tee_times t
      JOIN users u ON t.creator_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE t.id = $1
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows[0];
  }

  // Get user's tee times
  async getUserTeeTimes(userId, status = null) {
    let query = `
      SELECT DISTINCT t.*, u.first_name as creator_first_name, u.last_name as creator_last_name,
             (SELECT COUNT(*) FROM tee_time_participants WHERE tee_time_id = t.id) as participant_count
      FROM tee_times t
      JOIN users u ON t.creator_id = u.id
      LEFT JOIN tee_time_participants p ON t.id = p.tee_time_id
      WHERE (t.creator_id = $1 OR p.user_id = $1)
    `;
    const params = [userId];
    
    if (status) {
      query += " AND t.status = $2";
      params.push(status);
    }
    
    query += " ORDER BY t.tee_date ASC, t.tee_time ASC";
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get upcoming tee times
  async getUpcomingTeeTimes(userId, limit = 10) {
    const query = `
      SELECT DISTINCT t.*, u.first_name as creator_first_name, u.last_name as creator_last_name,
             (SELECT COUNT(*) FROM tee_time_participants WHERE tee_time_id = t.id) as participant_count
      FROM tee_times t
      JOIN users u ON t.creator_id = u.id
      LEFT JOIN tee_time_participants p ON t.id = p.tee_time_id
      WHERE (t.creator_id = $1 OR p.user_id = $1)
        AND t.tee_date >= CURRENT_DATE
        AND t.status IN ('pending', 'confirmed')
      ORDER BY t.tee_date ASC, t.tee_time ASC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  // Update tee time status
  async updateStatus(teeTimeId, status) {
    const query = "UPDATE tee_times SET status = $1 WHERE id = $2 RETURNING *";
    const result = await pool.query(query, [status, teeTimeId]);
    return result.rows[0];
  }

  // Add participant
  async addParticipant(teeTimeId, userId, phone, name, position, isCreator = false) {
    const query = `
      INSERT INTO tee_time_participants (tee_time_id, user_id, phone, name, position, is_creator)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tee_time_id, user_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId, userId, phone, name, position, isCreator]);
    return result.rows[0];
  }

  // Get participants
  async getParticipants(teeTimeId) {
    const query = `
      SELECT p.*, u.first_name, u.last_name, u.username, up.avatar_url, up.handicap
      FROM tee_time_participants p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE p.tee_time_id = $1
      ORDER BY p.position ASC
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  // Remove participant
  async removeParticipant(teeTimeId, participantId) {
    const query = "DELETE FROM tee_time_participants WHERE tee_time_id = $1 AND id = $2 RETURNING *";
    const result = await pool.query(query, [teeTimeId, participantId]);
    return result.rows[0];
  }

  // Get participant count
  async getParticipantCount(teeTimeId) {
    const query = "SELECT COUNT(*) as count FROM tee_time_participants WHERE tee_time_id = $1";
    const result = await pool.query(query, [teeTimeId]);
    return parseInt(result.rows[0].count);
  }

  // Cancel tee time
  async cancelTeeTime(teeTimeId, userId) {
    const query = `
      UPDATE tee_times SET status = 'cancelled' 
      WHERE id = $1 AND creator_id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId, userId]);
    return result.rows[0];
  }

  // Get tee times by date range
  async getTeeTimesByDateRange(userId, startDate, endDate) {
    const query = `
      SELECT DISTINCT t.*, 
             (SELECT COUNT(*) FROM tee_time_participants WHERE tee_time_id = t.id) as participant_count
      FROM tee_times t
      LEFT JOIN tee_time_participants p ON t.id = p.tee_time_id
      WHERE (t.creator_id = $1 OR p.user_id = $1)
        AND t.tee_date BETWEEN $2 AND $3
      ORDER BY t.tee_date ASC, t.tee_time ASC
    `;
    const result = await pool.query(query, [userId, startDate, endDate]);
    return result.rows;
  }

  // Remove participant by user ID
  async removeParticipantByUser(teeTimeId, userId) {
    const query = `
      UPDATE tee_time_participants 
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE tee_time_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId, userId]);
    return result.rows[0];
  }

  // Get tee times in a specific time range (for cron jobs)
  async getTeeTimesInRange(startTime, endTime, statuses = ['confirmed']) {
    const query = `
      SELECT * FROM tee_times
      WHERE (tee_date + tee_time) BETWEEN $1 AND $2
        AND status = ANY($3)
    `;
    const result = await pool.query(query, [startTime, endTime, statuses]);
    return result.rows;
  }

  // Get in-progress tee times older than cutoff (for auto-complete)
  async getInProgressTeeTimes(cutoffTime) {
    const query = `
      SELECT * FROM tee_times
      WHERE status = 'in_progress'
        AND (tee_date + tee_time) < $1
        AND check_in_completed_at IS NULL
    `;
    const result = await pool.query(query, [cutoffTime]);
    return result.rows;
  }

  // Get complete tee time history with attendance status
  async getTeeTimeHistory(userId, options = {}) {
    const { filter = 'all', limit = 20, offset = 0 } = options;
    
    let whereClause = `(t.creator_id = $1 OR ttp.user_id = $1)`;
    
    if (filter === 'upcoming') {
      whereClause += ` AND t.tee_date >= CURRENT_DATE AND t.status NOT IN ('cancelled', 'completed')`;
    } else if (filter === 'completed') {
      whereClause += ` AND t.status = 'completed'`;
    } else if (filter === 'cancelled') {
      whereClause += ` AND (t.status = 'cancelled' OR ttp.status = 'cancelled')`;
    } else if (filter === 'no_show') {
      whereClause += ` AND tta.status = 'no_show'`;
    }
    
    const query = `
      SELECT DISTINCT ON (t.id)
        t.id,
        t.course_name,
        t.course_location,
        t.tee_date,
        t.tee_time,
        t.status as tee_time_status,
        t.creator_id,
        t.max_players,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        up.avatar_url as creator_avatar,
        ttp.status as participant_status,
        tta.status as attendance_status,
        gs.score as game_score,
        gs.holes_played,
        CASE 
          WHEN t.creator_id = $1 THEN 'organizer'
          ELSE 'participant'
        END as user_role,
        (SELECT COUNT(*) FROM tee_time_participants WHERE tee_time_id = t.id AND status = 'confirmed') as participant_count
      FROM tee_times t
      LEFT JOIN tee_time_participants ttp ON t.id = ttp.tee_time_id AND ttp.user_id = $1
      LEFT JOIN tee_time_attendance tta ON ttp.id = tta.participant_id
      LEFT JOIN game_scores gs ON t.id = gs.tee_time_id AND gs.user_id = $1
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClause}
      ORDER BY t.id, t.tee_date DESC, t.tee_time DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }
}

module.exports = new TeeTimeRepository();

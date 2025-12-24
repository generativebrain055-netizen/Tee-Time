const { pool } = require("../config/database");
const logger = require("../config/logger");

class InviteRepository {
  // ============================================================================
  // INVITE RESPONSES - New table for tracking response history
  // ============================================================================
  
  // Create invite response record
  async createInviteResponse(responseData) {
    const { inviteId, userId, response, responseMessage, respondedVia, ipAddress, deviceInfo } = responseData;
    
    const query = `
      INSERT INTO invite_responses (invite_id, user_id, response, response_message, responded_via, ip_address, device_info)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      inviteId, userId || null, response, responseMessage || null, 
      respondedVia || 'app', ipAddress || null, deviceInfo ? JSON.stringify(deviceInfo) : null
    ]);
    return result.rows[0];
  }

  // Get response history for an invite
  async getInviteResponses(inviteId) {
    const query = `
      SELECT ir.*, u.first_name, u.last_name, u.phone_number
      FROM invite_responses ir
      LEFT JOIN users u ON ir.user_id = u.id
      WHERE ir.invite_id = $1
      ORDER BY ir.created_at DESC
    `;
    const result = await pool.query(query, [inviteId]);
    return result.rows;
  }

  // Get all responses by a user
  async getUserResponseHistory(userId) {
    const query = `
      SELECT ir.*, i.tee_time_id, tt.course_name, tt.tee_date, tt.tee_time
      FROM invite_responses ir
      JOIN invites i ON ir.invite_id = i.id
      JOIN tee_times tt ON i.tee_time_id = tt.id
      WHERE ir.user_id = $1
      ORDER BY ir.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Count responses by type for a tee time
  async getResponseStats(teeTimeId) {
    const query = `
      SELECT ir.response, COUNT(*) as count
      FROM invite_responses ir
      JOIN invites i ON ir.invite_id = i.id
      WHERE i.tee_time_id = $1
      GROUP BY ir.response
    `;
    const result = await pool.query(query, [teeTimeId]);
    
    const stats = { accepted: 0, declined: 0, maybe: 0, waitlist: 0 };
    result.rows.forEach(row => { stats[row.response] = parseInt(row.count); });
    return stats;
  }

  // ============================================================================
  // EXISTING INVITE METHODS
  // ============================================================================

  // Create invite
  async createInvite(teeTimeId, inviterId, inviteeData) {
    const { inviteeUserId, inviteePhone, inviteeName, position } = inviteeData;
    
    const query = `
      INSERT INTO invites (tee_time_id, inviter_id, invitee_user_id, invitee_phone, invitee_name, position)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      teeTimeId, inviterId, inviteeUserId, inviteePhone, inviteeName, position
    ]);
    return result.rows[0];
  }

  // Create multiple invites
  async createBulkInvites(teeTimeId, inviterId, invitees) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const invites = [];
      for (let i = 0; i < invitees.length; i++) {
        const inv = invitees[i];
        const result = await client.query(
          `INSERT INTO invites (tee_time_id, inviter_id, invitee_user_id, invitee_phone, invitee_name, position)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [teeTimeId, inviterId, inv.userId || null, inv.phone || null, inv.name || null, i]
        );
        invites.push(result.rows[0]);
      }
      
      await client.query("COMMIT");
      return invites;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Create multiple invites with expiry times (for roster invites)
  async createBulkInvitesWithExpiry(teeTimeId, inviterId, invitees) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const invites = [];
      for (let i = 0; i < invitees.length; i++) {
        const inv = invitees[i];
        const result = await client.query(
          `INSERT INTO invites (tee_time_id, inviter_id, invitee_user_id, invitee_phone, invitee_name, position, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            teeTimeId, 
            inviterId, 
            inv.userId || null, 
            inv.phone || null, 
            inv.name || null, 
            inv.position || i,
            inv.expiresAt || null
          ]
        );
        invites.push(result.rows[0]);
      }
      
      await client.query("COMMIT");
      return invites;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Get next pending invite in queue (for roster sequential invites)
  async getNextPendingInvite(teeTimeId) {
    const query = `
      SELECT i.*, u.first_name, u.last_name
      FROM invites i
      LEFT JOIN users u ON i.invitee_user_id = u.id
      WHERE i.tee_time_id = $1 
        AND i.status = 'pending'
        AND i.expires_at IS NULL
      ORDER BY i.position ASC
      LIMIT 1
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows[0];
  }

  // Activate an invite (set expiry time)
  async activateInvite(inviteId, expiresAt) {
    const query = `
      UPDATE invites 
      SET expires_at = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [expiresAt, inviteId]);
    return result.rows[0];
  }

  // Move all remaining pending invites to waitlist (for FCFS when full)
  async moveRemainingToWaitlist(teeTimeId) {
    const query = `
      UPDATE invites 
      SET status = 'waitlist', updated_at = NOW()
      WHERE tee_time_id = $1 AND status = 'pending'
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  // Expire old pending invites (for cron job)
  async expireOldInvites() {
    const query = `
      UPDATE invites 
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW()
      RETURNING *
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Get invite by ID
  async getInviteById(inviteId) {
    const query = `
      SELECT i.*, 
             t.course_name, t.course_location, t.tee_date, t.tee_time, t.invite_type,
             u.first_name as inviter_first_name, u.last_name as inviter_last_name
      FROM invites i
      JOIN tee_times t ON i.tee_time_id = t.id
      JOIN users u ON i.inviter_id = u.id
      WHERE i.id = $1
    `;
    const result = await pool.query(query, [inviteId]);
    return result.rows[0];
  }

  // Get invites for a tee time
  async getInvitesByTeeTime(teeTimeId) {
    const query = `
      SELECT i.*, u.first_name, u.last_name, u.username, p.avatar_url
      FROM invites i
      LEFT JOIN users u ON i.invitee_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE i.tee_time_id = $1
      ORDER BY i.position ASC
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  // Get user's pending invites (received)
  async getPendingInvites(userId) {
    const query = `
      SELECT i.*, 
             t.course_name, t.course_location, t.tee_date, t.tee_time, t.invite_type, t.max_players,
             u.first_name as inviter_first_name, u.last_name as inviter_last_name, p.avatar_url as inviter_avatar
      FROM invites i
      JOIN tee_times t ON i.tee_time_id = t.id
      JOIN users u ON i.inviter_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE i.invitee_user_id = $1 AND i.status = 'pending'
      ORDER BY t.tee_date ASC, t.tee_time ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Get user's sent invites
  async getSentInvites(userId) {
    const query = `
      SELECT i.*, 
             t.course_name, t.course_location, t.tee_date, t.tee_time,
             iu.first_name as invitee_first_name, iu.last_name as invitee_last_name
      FROM invites i
      JOIN tee_times t ON i.tee_time_id = t.id
      LEFT JOIN users iu ON i.invitee_user_id = iu.id
      WHERE i.inviter_id = $1
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Respond to invite
  async respondToInvite(inviteId, userId, status) {
    const query = `
      UPDATE invites 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND invitee_user_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, inviteId, userId]);
    return result.rows[0];
  }

  // Mark SMS as sent
  async markSmsSent(inviteId) {
    const query = `
      UPDATE invites SET sms_sent = true, sms_sent_at = NOW()
      WHERE id = $1 RETURNING *
    `;
    const result = await pool.query(query, [inviteId]);
    return result.rows[0];
  }

  // Get invites needing SMS (for non-app users)
  async getInvitesNeedingSms(teeTimeId) {
    const query = `
      SELECT * FROM invites
      WHERE tee_time_id = $1 
        AND invitee_user_id IS NULL 
        AND invitee_phone IS NOT NULL
        AND sms_sent = false
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  // Check if user already invited
  async isAlreadyInvited(teeTimeId, userId = null, phone = null) {
    let query, params;
    if (userId) {
      query = "SELECT id FROM invites WHERE tee_time_id = $1 AND invitee_user_id = $2";
      params = [teeTimeId, userId];
    } else {
      query = "SELECT id FROM invites WHERE tee_time_id = $1 AND invitee_phone = $2";
      params = [teeTimeId, phone];
    }
    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }

  // Get invite by phone for a tee time
  async getInviteByPhone(teeTimeId, phone) {
    const query = "SELECT * FROM invites WHERE tee_time_id = $1 AND invitee_phone = $2";
    const result = await pool.query(query, [teeTimeId, phone]);
    return result.rows[0];
  }

  // Cancel invite
  async cancelInvite(inviteId, inviterId) {
    const query = "DELETE FROM invites WHERE id = $1 AND inviter_id = $2 RETURNING *";
    const result = await pool.query(query, [inviteId, inviterId]);
    return result.rows[0];
  }

  // Move to waitlist
  async moveToWaitlist(inviteId) {
    const query = "UPDATE invites SET status = 'waitlist' WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [inviteId]);
    return result.rows[0];
  }

  // Get waitlist for tee time
  async getWaitlist(teeTimeId) {
    const query = `
      SELECT i.*, u.first_name, u.last_name, p.avatar_url
      FROM invites i
      LEFT JOIN users u ON i.invitee_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE i.tee_time_id = $1 AND i.status = 'waitlist'
      ORDER BY i.created_at ASC
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  // Check if all invites have been responded to (accepted or declined)
  async checkAllInvitesResponded(teeTimeId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status IN ('accepted', 'declined', 'expired')) as responded_count,
        COUNT(*) as total_count
      FROM invites
      WHERE tee_time_id = $1
    `;
    const result = await pool.query(query, [teeTimeId]);
    const { pending_count, responded_count, total_count } = result.rows[0];
    return {
      allResponded: parseInt(pending_count) === 0 && parseInt(total_count) > 0,
      pendingCount: parseInt(pending_count),
      respondedCount: parseInt(responded_count),
      totalCount: parseInt(total_count),
    };
  }

  // Get waitlist users with their user IDs for notifications
  async getWaitlistUsersForNotification(teeTimeId) {
    const query = `
      SELECT i.id, i.invitee_user_id, i.invitee_phone, i.invitee_name,
             u.first_name, u.last_name
      FROM invites i
      LEFT JOIN users u ON i.invitee_user_id = u.id
      WHERE i.tee_time_id = $1 AND i.status = 'waitlist'
      ORDER BY i.position ASC
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  // Get users who haven't responded yet (for FCFS spot opened notification)
  async getPendingInviteUsers(teeTimeId) {
    const query = `
      SELECT i.id, i.invitee_user_id, i.invitee_phone, i.invitee_name,
             u.first_name, u.last_name
      FROM invites i
      LEFT JOIN users u ON i.invitee_user_id = u.id
      WHERE i.tee_time_id = $1 AND i.status = 'pending'
      ORDER BY i.position ASC
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }

  // Reactivate waitlist invites as pending (when spot opens in FCFS)
  async reactivateWaitlistInvites(teeTimeId, expiresAt = null) {
    const query = `
      UPDATE invites 
      SET status = 'pending', expires_at = $2, updated_at = NOW()
      WHERE tee_time_id = $1 AND status = 'waitlist'
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId, expiresAt]);
    return result.rows;
  }

  // Accept FCFS invite with roster position tie-breaker
  // Returns true if accepted, false if someone with higher roster position already accepted
  async acceptFCFSWithTieBreaker(inviteId, userId, rosterPosition) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get the invite and tee time info
      const inviteResult = await client.query(
        `SELECT i.*, t.max_players, t.creator_id
         FROM invites i
         JOIN tee_times t ON i.tee_time_id = t.id
         WHERE i.id = $1`,
        [inviteId]
      );
      const invite = inviteResult.rows[0];
      if (!invite) {
        await client.query("ROLLBACK");
        return { success: false, reason: 'invite_not_found' };
      }

      // Get current participant count
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM tee_time_participants 
         WHERE tee_time_id = $1 AND (status IS NULL OR status != 'cancelled')`,
        [invite.tee_time_id]
      );
      const participantCount = parseInt(countResult.rows[0].count);

      // Check if there's room
      if (participantCount >= invite.max_players) {
        await client.query("ROLLBACK");
        return { success: false, reason: 'full' };
      }

      // Check for simultaneous accepts - get all accepted invites in the last few seconds
      // with their roster positions
      const recentAcceptsResult = await client.query(
        `SELECT i.id, i.invitee_user_id, i.position as invite_position,
                r.position as roster_position
         FROM invites i
         LEFT JOIN roster r ON r.user_id = $2 AND r.contact_user_id = i.invitee_user_id
         WHERE i.tee_time_id = $1 
           AND i.status = 'accepted'
           AND i.updated_at > NOW() - INTERVAL '5 seconds'
         ORDER BY COALESCE(r.position, 999999) ASC`,
        [invite.tee_time_id, invite.creator_id]
      );

      // If there are recent accepts and we'd exceed max players, check roster position
      const potentialCount = participantCount + recentAcceptsResult.rows.length + 1;
      if (potentialCount > invite.max_players) {
        // Check if this user has higher roster priority than any recent accept
        const userRosterResult = await client.query(
          `SELECT position FROM roster 
           WHERE user_id = $1 AND contact_user_id = $2`,
          [invite.creator_id, userId]
        );
        const userRosterPos = userRosterResult.rows[0]?.position ?? 999999;

        // Find if any recent accept has lower priority (higher position number)
        const lowerPriorityAccept = recentAcceptsResult.rows.find(
          r => (r.roster_position ?? 999999) > userRosterPos
        );

        if (!lowerPriorityAccept) {
          // This user doesn't have priority, move to waitlist
          await client.query("ROLLBACK");
          return { success: false, reason: 'tie_breaker_lost' };
        }

        // This user has priority - the lower priority accept will be moved to waitlist
        // by a separate cleanup process
      }

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Set FCFS deadline for all pending invites
  async setFCFSDeadline(teeTimeId, deadline) {
    const query = `
      UPDATE invites 
      SET expires_at = $2, updated_at = NOW()
      WHERE tee_time_id = $1 AND status = 'pending'
      RETURNING *
    `;
    const result = await pool.query(query, [teeTimeId, deadline]);
    return result.rows;
  }

  // Get invites expiring soon (for deadline notifications)
  async getInvitesExpiringSoon(hoursUntilExpiry) {
    const query = `
      SELECT i.*, t.course_name, t.course_location, t.tee_date, t.tee_time,
             t.creator_id, t.invite_type
      FROM invites i
      JOIN tee_times t ON i.tee_time_id = t.id
      WHERE i.status = 'pending'
        AND i.expires_at IS NOT NULL
        AND i.expires_at BETWEEN NOW() AND NOW() + INTERVAL '${hoursUntilExpiry} hours'
        AND i.deadline_notification_sent = false
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Mark deadline notification as sent
  async markDeadlineNotificationSent(inviteId) {
    const query = `
      UPDATE invites SET deadline_notification_sent = true
      WHERE id = $1 RETURNING *
    `;
    const result = await pool.query(query, [inviteId]);
    return result.rows[0];
  }

  // Get pending invites for a tee time (invites that haven't expired or been responded to)
  async getPendingInvitesByTeeTime(teeTimeId) {
    const query = `
      SELECT i.*, u.first_name, u.last_name
      FROM invites i
      LEFT JOIN users u ON i.invitee_user_id = u.id
      WHERE i.tee_time_id = $1 
        AND i.status = 'pending'
      ORDER BY i.position ASC
    `;
    const result = await pool.query(query, [teeTimeId]);
    return result.rows;
  }
}

module.exports = new InviteRepository();

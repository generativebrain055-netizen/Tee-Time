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
}

module.exports = new InviteRepository();

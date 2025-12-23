const { pool } = require("../config/database");
const logger = require("../config/logger");

class RosterRepository {
  // Get user's roster ordered by position with enhanced data
  async getRoster(userId, options = {}) {
    const { groupId, sortBy = 'position', isOnDeck } = options;
    
    let whereClause = 'r.user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (groupId) {
      whereClause += ` AND r.group_id = $${paramIndex}`;
      params.push(groupId);
      paramIndex++;
    }

    if (isOnDeck !== undefined) {
      whereClause += ` AND r.is_on_deck = $${paramIndex}`;
      params.push(isOnDeck);
      paramIndex++;
    }

    let orderBy = 'r.position ASC';
    switch (sortBy) {
      case 'socialRate':
        orderBy = 'p.social_rate DESC NULLS LAST, r.position ASC';
        break;
      case 'handicap':
        orderBy = 'COALESCE(r.contact_handicap, p.handicap) ASC NULLS LAST, r.position ASC';
        break;
      case 'name':
        orderBy = "COALESCE(r.contact_name, u.first_name || ' ' || u.last_name) ASC";
        break;
      case 'distance':
        orderBy = 'r.distance_to_course ASC NULLS LAST, r.position ASC';
        break;
      case 'membership':
        orderBy = 'r.club_membership ASC NULLS LAST, r.position ASC';
        break;
    }

    const query = `
      SELECT r.*, 
             u.first_name, u.last_name, u.username,
             p.avatar_url, p.handicap as user_handicap, p.social_rate as profile_social_rate,
             p.location, p.home_course, p.preferred_tee_time, p.walk_or_ride,
             p.rounds_played, p.average_score,
             g.name as group_name, g.color as group_color
      FROM roster r
      LEFT JOIN users u ON r.contact_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN roster_groups g ON r.group_id = g.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
    `;
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get on-deck players
  async getOnDeck(userId) {
    const query = `
      SELECT r.*, 
             u.first_name, u.last_name, u.username, 
             p.avatar_url, p.handicap as user_handicap
      FROM roster r
      LEFT JOIN users u ON r.contact_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE r.user_id = $1 AND r.is_on_deck = true
      ORDER BY r.position ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Add to roster
  async addToRoster(userId, contact) {
    const { contactUserId, contactPhone, contactName, contactEmail } = contact;
    
    // Get max position
    const posResult = await pool.query(
      "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM roster WHERE user_id = $1",
      [userId]
    );
    const position = posResult.rows[0].next_pos;

    const query = `
      INSERT INTO roster (user_id, contact_user_id, contact_phone, contact_name, contact_email, position)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId, contactUserId, contactPhone, contactName, contactEmail, position
    ]);
    return result.rows[0];
  }

  // Remove from roster
  async removeFromRoster(userId, rosterId) {
    const query = "DELETE FROM roster WHERE id = $1 AND user_id = $2 RETURNING *";
    const result = await pool.query(query, [rosterId, userId]);
    return result.rows[0];
  }

  // Reorder roster (drag & drop)
  async reorderRoster(userId, orderedIds) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          "UPDATE roster SET position = $1 WHERE id = $2 AND user_id = $3",
          [i, orderedIds[i], userId]
        );
      }
      
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Toggle on-deck status
  async toggleOnDeck(userId, rosterId, isOnDeck) {
    const query = `
      UPDATE roster SET is_on_deck = $1 WHERE id = $2 AND user_id = $3 RETURNING *
    `;
    const result = await pool.query(query, [isOnDeck, rosterId, userId]);
    return result.rows[0];
  }

  // Get roster entry by ID
  async getRosterEntry(userId, rosterId) {
    const query = `
      SELECT r.*, u.first_name, u.last_name, u.username, p.avatar_url
      FROM roster r
      LEFT JOIN users u ON r.contact_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE r.id = $1 AND r.user_id = $2
    `;
    const result = await pool.query(query, [rosterId, userId]);
    return result.rows[0];
  }

  // Search users to add to roster
  async searchUsers(query, excludeUserId) {
    const searchQuery = `
      SELECT id, phone_number, first_name, last_name, username, avatar_url, handicap
      FROM users
      WHERE id != $1 AND deleted_at IS NULL AND is_active = true
        AND (
          phone_number ILIKE $2 OR
          username ILIKE $2 OR
          first_name ILIKE $2 OR
          last_name ILIKE $2
        )
      LIMIT 20
    `;
    const result = await pool.query(searchQuery, [excludeUserId, `%${query}%`]);
    return result.rows;
  }

  // Check if contact already in roster
  async isInRoster(userId, contactUserId = null, contactPhone = null) {
    let query, params;
    if (contactUserId) {
      query = "SELECT id FROM roster WHERE user_id = $1 AND contact_user_id = $2";
      params = [userId, contactUserId];
    } else {
      query = "SELECT id FROM roster WHERE user_id = $1 AND contact_phone = $2";
      params = [userId, contactPhone];
    }
    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }

  // ============ ROSTER GROUPS ============

  // Get all groups for user (owned + member of)
  async getGroups(userId) {
    // Get groups the user owns OR groups where the user is a member
    // A user is a member of a group if someone has them in their roster with that group_id
    const query = `
      SELECT DISTINCT g.*, 
             (SELECT COUNT(*) FROM roster WHERE group_id = g.id) as member_count,
             (SELECT COUNT(*) FROM roster WHERE group_id = g.id AND is_on_deck = true) as on_deck_count,
             CASE WHEN g.user_id = $1 THEN true ELSE false END as is_owner
      FROM roster_groups g
      LEFT JOIN roster r ON g.id = r.group_id
      WHERE g.user_id = $1 
         OR r.contact_user_id = $1
      GROUP BY g.id
      ORDER BY g.position ASC, g.created_at ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Create a new group
  async createGroup(userId, data) {
    const { name, description, color, icon, autoInvite, maxMembers } = data;
    
    // Check for duplicate name (case-insensitive)
    const existingName = await pool.query(
      "SELECT id FROM roster_groups WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
      [userId, name]
    );
    if (existingName.rows.length > 0) {
      const error = new Error("You already have a roster with this name");
      error.code = "DUPLICATE_NAME";
      throw error;
    }
    
    const posResult = await pool.query(
      "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM roster_groups WHERE user_id = $1",
      [userId]
    );
    const position = posResult.rows[0].next_pos;

    const query = `
      INSERT INTO roster_groups (user_id, name, description, color, icon, position, auto_invite, max_members)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId, name, description, color || '#5DB075', icon, position, 
      autoInvite !== false, maxMembers || 20
    ]);
    return result.rows[0];
  }

  // Update group
  async updateGroup(userId, groupId, data) {
    const { name, description, color, icon, autoInvite, maxMembers, sortPreference } = data;
    
    // Check for duplicate name if name is being changed
    if (name) {
      const existingName = await pool.query(
        "SELECT id FROM roster_groups WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3",
        [userId, name, groupId]
      );
      if (existingName.rows.length > 0) {
        const error = new Error("You already have a roster with this name");
        error.code = "DUPLICATE_NAME";
        throw error;
      }
    }
    
    const query = `
      UPDATE roster_groups 
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          color = COALESCE($5, color),
          icon = COALESCE($6, icon),
          auto_invite = COALESCE($7, auto_invite),
          max_members = COALESCE($8, max_members),
          sort_preference = COALESCE($9, sort_preference),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [
      groupId, userId, name, description, color, icon, autoInvite, maxMembers, sortPreference
    ]);
    return result.rows[0];
  }

  // Update group sort preference
  async updateGroupSortPreference(userId, groupId, sortBy) {
    const validSorts = ['position', 'socialRate', 'handicap', 'name', 'distance', 'membership'];
    if (!validSorts.includes(sortBy)) {
      throw new Error("Invalid sort option");
    }
    
    const result = await pool.query(
      `UPDATE roster_groups SET sort_preference = $3, updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [groupId, userId, sortBy]
    );
    return result.rows[0];
  }

  // Get auto-invite members for a group (not on-deck)
  async getAutoInviteMembers(userId, groupId) {
    const query = `
      SELECT r.*, 
             u.first_name, u.last_name, u.username, u.phone_number,
             p.avatar_url, p.handicap as user_handicap, p.social_rate
      FROM roster r
      LEFT JOIN users u ON r.contact_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE r.user_id = $1 AND r.group_id = $2 AND r.is_on_deck = false
      ORDER BY r.position ASC
    `;
    const result = await pool.query(query, [userId, groupId]);
    return result.rows;
  }

  // Delete group
  async deleteGroup(userId, groupId) {
    // First, remove group_id from roster entries
    await pool.query(
      "UPDATE roster SET group_id = NULL WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    
    const query = "DELETE FROM roster_groups WHERE id = $1 AND user_id = $2 RETURNING *";
    const result = await pool.query(query, [groupId, userId]);
    return result.rows[0];
  }

  // Add multiple members to a group by their user IDs (friend IDs)
  async addMembersToGroup(userId, groupId, memberUserIds) {
    const client = await pool.connect();
    let addedCount = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const memberUserId of memberUserIds) {
        // Find the roster entry for this friend
        const rosterResult = await client.query(
          `SELECT id FROM roster WHERE user_id = $1 AND contact_user_id = $2`,
          [userId, memberUserId]
        );
        
        if (rosterResult.rows.length > 0) {
          // Update the roster entry to belong to this group
          await client.query(
            `UPDATE roster SET group_id = $1, updated_at = NOW() WHERE id = $2`,
            [groupId, rosterResult.rows[0].id]
          );
          addedCount++;
        } else {
          // Friend not in roster yet, add them
          const posResult = await client.query(
            "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM roster WHERE user_id = $1",
            [userId]
          );
          const position = posResult.rows[0].next_pos;
          
          await client.query(
            `INSERT INTO roster (user_id, contact_user_id, group_id, position)
             VALUES ($1, $2, $3, $4)`,
            [userId, memberUserId, groupId, position]
          );
          addedCount++;
        }
      }
      
      await client.query('COMMIT');
      return addedCount;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get group members
  async getGroupMembers(userId, groupId) {
    return this.getRoster(userId, { groupId });
  }

  // Check if user has access to a group (owner or member)
  async getGroupWithAccess(userId, groupId) {
    const query = `
      SELECT g.*, 
             CASE WHEN g.user_id = $1 THEN true ELSE false END as is_owner
      FROM roster_groups g
      LEFT JOIN roster r ON g.id = r.group_id
      WHERE g.id = $2 
        AND (g.user_id = $1 OR r.contact_user_id = $1)
      LIMIT 1
    `;
    const result = await pool.query(query, [userId, groupId]);
    return result.rows[0];
  }

  // Get all members of a group (regardless of who owns the roster entries)
  async getGroupMembersForGroup(groupId, sortBy = 'position') {
    let orderBy = 'r.position ASC';
    switch (sortBy) {
      case 'socialRate':
        orderBy = 'p.social_rate DESC NULLS LAST, r.position ASC';
        break;
      case 'handicap':
        orderBy = 'COALESCE(r.contact_handicap, p.handicap) ASC NULLS LAST, r.position ASC';
        break;
      case 'name':
        orderBy = "COALESCE(r.contact_name, u.first_name || ' ' || u.last_name) ASC";
        break;
    }

    const query = `
      SELECT r.*, 
             u.first_name, u.last_name, u.username,
             p.avatar_url, p.handicap as user_handicap, p.social_rate as profile_social_rate,
             p.location, p.home_course, p.preferred_tee_time, p.walk_or_ride,
             p.rounds_played, p.average_score,
             g.name as group_name, g.color as group_color
      FROM roster r
      LEFT JOIN users u ON r.contact_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN roster_groups g ON r.group_id = g.id
      WHERE r.group_id = $1
      ORDER BY ${orderBy}
    `;
    const result = await pool.query(query, [groupId]);
    return result.rows;
  }

  // Add member to group
  async addToGroup(userId, rosterId, groupId) {
    const query = `
      UPDATE roster SET group_id = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [rosterId, userId, groupId]);
    return result.rows[0];
  }

  // Remove member from group
  async removeFromGroup(userId, rosterId) {
    const query = `
      UPDATE roster SET group_id = NULL, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [rosterId, userId]);
    return result.rows[0];
  }

  // Move member between roster and on-deck (or between groups)
  async moveMember(userId, rosterId, targetGroupId, isOnDeck, newPosition) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update the member
      const updateQuery = `
        UPDATE roster 
        SET group_id = $3, is_on_deck = $4, position = $5, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [
        rosterId, userId, targetGroupId, isOnDeck, newPosition
      ]);

      // Reorder other members if needed
      if (newPosition !== null) {
        await client.query(`
          UPDATE roster 
          SET position = position + 1 
          WHERE user_id = $1 AND id != $2 AND position >= $3
            AND (group_id = $4 OR ($4 IS NULL AND group_id IS NULL))
            AND is_on_deck = $5
        `, [userId, rosterId, newPosition, targetGroupId, isOnDeck]);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============ MEMBER HISTORY ============

  // Get playing history for a roster member
  async getMemberHistory(userId, rosterId) {
    const query = `
      SELECT h.*, t.course_name, t.tee_date, t.tee_time, t.status as tee_time_status
      FROM roster_member_history h
      JOIN roster r ON h.roster_id = r.id
      LEFT JOIN tee_times t ON h.tee_time_id = t.id
      WHERE r.id = $1 AND r.user_id = $2
      ORDER BY h.created_at DESC
      LIMIT 20
    `;
    const result = await pool.query(query, [rosterId, userId]);
    return result.rows;
  }

  // Record playing history
  async recordHistory(rosterId, teeTimeId, inviteStatus, playedTogether) {
    const query = `
      INSERT INTO roster_member_history (roster_id, tee_time_id, invite_status, played_together)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [rosterId, teeTimeId, inviteStatus, playedTogether]);
    
    // Update times_played_together if they played
    if (playedTogether) {
      await pool.query(
        "UPDATE roster SET times_played_together = times_played_together + 1, last_played_together = NOW() WHERE id = $1",
        [rosterId]
      );
    }
    
    return result.rows[0];
  }

  // ============ WAIVER WIRE ============

  // Get waiver wire entries for a date
  async getWaiverWire(date, excludeUserId) {
    const query = `
      SELECT w.*, u.first_name, u.last_name, u.username,
             p.avatar_url, p.handicap, p.social_rate, p.location, p.home_course
      FROM waiver_wire w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE w.available_date = $1 AND w.is_active = true AND w.user_id != $2
        AND (w.expires_at IS NULL OR w.expires_at > NOW())
      ORDER BY p.social_rate DESC NULLS LAST
    `;
    const result = await pool.query(query, [date, excludeUserId]);
    return result.rows;
  }

  // Add to waiver wire
  async addToWaiverWire(userId, data) {
    const { availableDate, preferredTime, preferredCourse, maxHandicap, notes, expiresAt } = data;
    const query = `
      INSERT INTO waiver_wire (user_id, available_date, preferred_time, preferred_course, max_handicap, notes, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, available_date) DO UPDATE SET
        preferred_time = EXCLUDED.preferred_time,
        preferred_course = EXCLUDED.preferred_course,
        max_handicap = EXCLUDED.max_handicap,
        notes = EXCLUDED.notes,
        expires_at = EXCLUDED.expires_at,
        is_active = true
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId, availableDate, preferredTime, preferredCourse, maxHandicap, notes, expiresAt
    ]);
    return result.rows[0];
  }

  // Remove from waiver wire
  async removeFromWaiverWire(userId, date) {
    const query = "UPDATE waiver_wire SET is_active = false WHERE user_id = $1 AND available_date = $2 RETURNING *";
    const result = await pool.query(query, [userId, date]);
    return result.rows[0];
  }

  // Get detailed member profile
  async getMemberProfile(userId, rosterId) {
    const query = `
      SELECT r.*, 
             u.first_name, u.last_name, u.username, u.phone_number,
             p.avatar_url, p.handicap, p.social_rate, p.location, p.home_course,
             p.preferred_tee_time, p.walk_or_ride, p.playing_partner_preference,
             p.rounds_played, p.average_score, p.bio,
             p.driver, p.irons, p.putter, p.ball,
             g.name as group_name, g.color as group_color,
             (SELECT COUNT(*) FROM roster_member_history WHERE roster_id = r.id AND played_together = true) as times_played,
             (SELECT COUNT(*) FROM roster_member_history WHERE roster_id = r.id AND invite_status = 'accepted') as invites_accepted,
             (SELECT COUNT(*) FROM roster_member_history WHERE roster_id = r.id) as total_invites
      FROM roster r
      LEFT JOIN users u ON r.contact_user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN roster_groups g ON r.group_id = g.id
      WHERE r.id = $1 AND r.user_id = $2
    `;
    const result = await pool.query(query, [rosterId, userId]);
    return result.rows[0];
  }
}

module.exports = new RosterRepository();

const { pool } = require("../config/database");
const logger = require("../config/logger");

/**
 * Service for handling roster-related notifications
 * Sends one-time notifications when users are added to someone's roster
 */
class RosterNotificationService {
  /**
   * Send notification when a user is added to someone's roster
   * Only sends once per roster entry (no spam on repeated adds)
   */
  async sendRosterAddNotification(rosterEntry, ownerUser) {
    const { id: rosterId, contact_user_id, group_id } = rosterEntry;
    
    // Can't notify non-users (phone-only contacts)
    if (!contact_user_id) {
      return { sent: false, reason: "non_user_contact" };
    }
    
    try {
      // Check if already notified for this roster entry
      const existing = await pool.query(
        `SELECT id FROM roster_notifications 
         WHERE roster_id = $1 AND notified_user_id = $2`,
        [rosterId, contact_user_id]
      );
      
      if (existing.rows.length > 0) {
        return { sent: false, reason: "already_notified" };
      }
      
      // Get group name if applicable
      let groupName = null;
      if (group_id) {
        const group = await pool.query(
          'SELECT name FROM roster_groups WHERE id = $1', 
          [group_id]
        );
        groupName = group.rows[0]?.name;
      }
      
      // Create notification tracking record
      await pool.query(
        `INSERT INTO roster_notifications 
         (roster_id, notified_user_id, roster_owner_id, group_id, group_name, notification_sent, notification_sent_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [rosterId, contact_user_id, ownerUser.id, group_id, groupName]
      );

      // Build notification message
      const ownerName = `${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() || 'Someone';
      const title = 'Added to Roster';
      const body = groupName 
        ? `${ownerName} added you to their roster "${groupName}"`
        : `${ownerName} added you to their roster`;
      
      // Create in-app notification
      await pool.query(
        `INSERT INTO notifications (user_id, type, channel, title, body, data, status)
         VALUES ($1, 'in_app', 'roster', $2, $3, $4, 'delivered')`,
        [
          contact_user_id,
          title,
          body,
          JSON.stringify({ 
            type: 'roster_add', 
            ownerId: ownerUser.id, 
            ownerName,
            groupName,
            rosterId
          })
        ]
      );
      
      logger.info(`Roster add notification sent to user ${contact_user_id} from ${ownerUser.id}`);
      
      // TODO: Send push notification via FCM/APNs when implemented
      // await pushNotificationService.send(contact_user_id, { title, body, data });
      
      return { sent: true, notifiedUserId: contact_user_id };
    } catch (error) {
      logger.error("Failed to send roster add notification:", error);
      return { sent: false, reason: "error", error: error.message };
    }
  }

  /**
   * Get pending roster notifications for a user
   */
  async getPendingNotifications(userId) {
    const result = await pool.query(
      `SELECT n.*, 
              u.first_name as owner_first_name, 
              u.last_name as owner_last_name,
              p.avatar_url as owner_avatar
       FROM roster_notifications n
       JOIN users u ON n.roster_owner_id = u.id
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE n.notified_user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      rosterId: row.roster_id,
      groupName: row.group_name,
      owner: {
        id: row.roster_owner_id,
        name: `${row.owner_first_name || ''} ${row.owner_last_name || ''}`.trim(),
        avatar: row.owner_avatar
      },
      notificationSent: row.notification_sent,
      createdAt: row.created_at
    }));
  }
}

module.exports = new RosterNotificationService();

const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

/**
 * Roster-related notification helpers (roster add notify is disabled).
 */
class RosterNotificationService {
  /**
   * Roster add notifications are disabled — contacts are not notified when added to a roster.
   */
  async sendRosterAddNotification(_rosterEntry, _ownerUser) {
    return { sent: false, reason: "roster_add_notifications_disabled" };
  }

  /**
   * Get pending roster notifications for a user
   */
  async getPendingNotifications(userId) {
    const { data, error } = await supabaseAdmin
      .from("roster_notifications")
      .select(`
        *,
        users!roster_notifications_roster_owner_id_fkey (
          first_name,
          last_name
        ),
        user_profiles!roster_notifications_roster_owner_id_fkey (
          avatar_url
        )
      `)
      .eq("notified_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      logger.error(`Error fetching pending notifications for user ${userId}:`, error.message);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      rosterId: row.roster_id,
      groupName: row.group_name,
      owner: {
        id: row.roster_owner_id,
        name: `${row.users?.first_name || ''} ${row.users?.last_name || ''}`.trim(),
        avatar: row.user_profiles?.avatar_url
      },
      notificationSent: row.notification_sent,
      createdAt: row.created_at
    }));
  }
}

module.exports = new RosterNotificationService();

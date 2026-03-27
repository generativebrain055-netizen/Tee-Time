const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");
const notificationService = require("./notificationService");

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
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("roster_notifications")
        .select("id")
        .eq("roster_id", rosterId)
        .eq("notified_user_id", contact_user_id)
        .limit(1);

      if (checkError) {
        logger.error("Error checking existing notification:", checkError.message);
        throw checkError;
      }
      
      if (existing && existing.length > 0) {
        return { sent: false, reason: "already_notified" };
      }
      
      // Get group name if applicable
      let groupName = null;
      if (group_id) {
        const { data: group, error: groupError } = await supabaseAdmin
          .from("roster_groups")
          .select("name")
          .eq("id", group_id)
          .single();

        if (!groupError && group) {
          groupName = group.name;
        }
      }
      
      // Create notification tracking record
      const { error: trackError } = await supabaseAdmin
        .from("roster_notifications")
        .insert({
          roster_id: rosterId,
          notified_user_id: contact_user_id,
          roster_owner_id: ownerUser.id,
          group_id: group_id,
          group_name: groupName,
          notification_sent: true,
          notification_sent_at: new Date().toISOString()
        });

      if (trackError) {
        logger.error("Error creating notification tracking:", trackError.message);
        throw trackError;
      }

      // Build notification message (uses notificationService for prefs + optional push)
      const ownerName = `${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() || 'Someone';
      const title = 'Added to Roster';
      const body = groupName
        ? `${ownerName} added you to their roster "${groupName}"`
        : `${ownerName} added you to their roster`;

      await notificationService.createNotification({
        userId: contact_user_id,
        title,
        body,
        data: {
          type: 'roster_add',
          ownerId: ownerUser.id,
          ownerName,
          groupName: groupName || null,
          rosterId,
        },
        sendPush: true,
      });
      
      logger.info(`Roster add notification sent to user ${contact_user_id} from ${ownerUser.id}`);
      
      return { sent: true, notifiedUserId: contact_user_id };
    } catch (error) {
      logger.error("Failed to send roster add notification:", error.message);
      return { sent: false, reason: "error", error: error.message };
    }
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

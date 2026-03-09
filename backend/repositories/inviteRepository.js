const { supabaseAdmin, handleError } = require("../config/supabase");
const logger = require("../config/logger");
const { invitesLogger } = require("../config/logger");

class InviteRepository {
  // Create invite
  async createInvite(teeTimeId, inviterId, inviteeData) {
    const { inviteeUserId, inviteePhone, inviteeName, position } = inviteeData;

    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .insert({
          tee_time_id: teeTimeId,
          inviter_id: inviterId,
          invitee_user_id: inviteeUserId,
          invitee_phone: inviteePhone,
          invitee_name: inviteeName,
          position,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "createInvite");
    }
  }

  async createBulkInvites(teeTimeId, inviterId, invitees) {
    try {
      // Validate and potentially fix user IDs
      const validatedInvitees = await Promise.all(
        invitees.map(async (inv, i) => {
          let userId = inv.userId || null;
          
          if (userId) {
            // Check if userId exists in users table
            const { data: userCheck, error: userError } = await supabaseAdmin
              .from("users")
              .select("id")
              .eq("id", userId)
              .is("deleted_at", null)
              .maybeSingle();
            
            if (userError) {
              invitesLogger.warn("[INVITE] Error checking user ID", {
                event: "user_id_check_error",
                userId,
                error: userError?.message,
              });
            } else if (!userCheck) {
              // User ID doesn't exist - might be a roster entry ID, try to look it up
              invitesLogger.warn("[INVITE] User ID not found in users table, checking roster", {
                event: "user_id_not_found",
                userId,
                inviteeName: inv.name,
              });
              
              const { data: rosterEntry } = await supabaseAdmin
                .from("roster")
                .select("contact_user_id")
                .eq("id", userId)
                .eq("user_id", inviterId)
                .maybeSingle();
              
              if (rosterEntry?.contact_user_id) {
                invitesLogger.info("[INVITE] Found contact_user_id from roster entry", {
                  event: "user_id_fixed_from_roster",
                  originalId: userId,
                  fixedId: rosterEntry.contact_user_id,
                });
                userId = rosterEntry.contact_user_id;
              } else {
                invitesLogger.error("[INVITE] User ID not found in users or roster", {
                  event: "user_id_invalid",
                  userId,
                  inviteeName: inv.name,
                });
                userId = null; // Clear invalid ID
              }
            }
          }
          
          return {
            ...inv,
            userId,
          };
        })
      );

      const inviteRecords = validatedInvitees.map((inv, i) => ({
        tee_time_id: teeTimeId,
        inviter_id: inviterId,
        invitee_user_id: inv.userId || null,
        invitee_phone: inv.phone || null,
        invitee_name: inv.name || null,
        position: inv.order != null ? inv.order : i,
      }));

      invitesLogger.info("[INVITE] Creating bulk invites", {
        event: "bulk_invites_create",
        teeTimeId,
        inviterId,
        totalInvitees: inviteRecords.length,
        withUserId: inviteRecords.filter(r => r.invitee_user_id).length,
        withPhone: inviteRecords.filter(r => r.invitee_phone).length,
        sampleInvitee: inviteRecords[0] ? {
          hasUserId: !!inviteRecords[0].invitee_user_id,
          userId: inviteRecords[0].invitee_user_id,
          hasPhone: !!inviteRecords[0].invitee_phone,
          name: inviteRecords[0].invitee_name,
        } : null,
      });

      logger.info(`Creating ${inviteRecords.length} invites for tee time ${teeTimeId}`, {
        withUserId: inviteRecords.filter(r => r.invitee_user_id).length,
        withPhone: inviteRecords.filter(r => r.invitee_phone).length,
      });

      const { data, error } = await supabaseAdmin
        .from("invites")
        .insert(inviteRecords)
        .select();

      if (error) throw error;
      
      invitesLogger.info("[INVITE] Bulk invites created successfully", {
        event: "bulk_invites_created",
        teeTimeId,
        inviteCount: (data || []).length,
        invites: (data || []).map(inv => ({
          inviteId: inv.id,
          inviteeUserId: inv.invitee_user_id,
          inviteePhone: inv.invitee_phone,
          inviteeName: inv.invitee_name,
          status: inv.status,
        })),
      });
      
      logger.info(`Successfully created ${(data || []).length} invites`);
      return data || [];
    } catch (error) {
      invitesLogger.error("[INVITE] Error creating bulk invites", {
        event: "bulk_invites_error",
        teeTimeId,
        error: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      handleError(error, "createBulkInvites");
    }
  }

  async getInviteById(inviteId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select(
          `
          *,
          tee_times (course_name, course_location, tee_date, tee_time, invite_type, max_players),
          users!invites_inviter_id_fkey (first_name, last_name)
        `
        )
        .eq("id", inviteId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;

      const teeTime = data.tee_times || {};
      const user = data.users || {};
      delete data.tee_times;
      delete data.users;

      return {
        ...data,
        course_name: teeTime.course_name,
        course_location: teeTime.course_location,
        tee_date: teeTime.tee_date,
        tee_time: teeTime.tee_time,
        invite_type: teeTime.invite_type,
        max_players: teeTime.max_players,
        inviter_first_name: user.first_name,
        inviter_last_name: user.last_name,
      };
    } catch (error) {
      handleError(error, "getInviteById");
    }
  }

  async getPendingInvites(userId) {
    try {
      // Use current ISO time for strict filtering of expired invites
      // This ensures users don't see invites that are technically expired but not yet processed by the scheduler
      const nowIso = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("invites")
        .select(
          `
          *,
          tee_times!inner (course_name, course_location, tee_date, tee_time, invite_type, max_players),
          users!invites_inviter_id_fkey (
            first_name, 
            last_name,
            user_profiles (avatar_url)
          )
        `
        )
        .eq("invitee_user_id", userId)
        .eq("status", "pending")
        // Filter out invites where deadline has passed
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("tee_times(tee_date)", { ascending: true });

      if (error) throw error;

      return (data || []).map((invite) => {
        const teeTime = invite.tee_times || {};
        const user = invite.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete invite.tee_times;
        delete invite.users;
        // user_profiles is inside users, not invite

        return {
          ...invite,
          ...teeTime,
          inviter_first_name: user.first_name,
          inviter_last_name: user.last_name,
          inviter_avatar: profile.avatar_url,
        };
      });
    } catch (error) {
      handleError(error, "getPendingInvites");
    }
  }

  async respondToInvite(inviteId, userId, status) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ status })
        .eq("id", inviteId)
        .eq("invitee_user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "respondToInvite");
    }
  }

  /**
   * Set invitee_user_id on an invite (e.g. after resolving phone to app user).
   * So the invite shows under Invites > Received for that user.
   */
  async updateInviteeUserId(inviteId, inviteeUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ invitee_user_id: inviteeUserId })
        .eq("id", inviteId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "updateInviteeUserId");
    }
  }

  /**
   * CRITICAL: Accept invite atomically with tie-breaker logic
   * This calls a PostgreSQL function - must be created first!
   * Run: backend/db/supabase_functions.sql in Supabase SQL Editor
   */
  async acceptInviteAtomic(inviteId, userId, userName, inviteType) {
    try {
      const { invitesLogger } = require("../config/logger");
      
      invitesLogger.info("[INVITE] Starting atomic invite acceptance", {
        event: "accept_invite_start",
        inviteId,
        userId,
        userName,
        inviteType,
      });

      // Note: Database function only accepts p_invite_id, p_user_id, p_response_message
      // userName and inviteType are not used by the function
      const { data, error } = await supabaseAdmin.rpc("accept_invite_atomic", {
        p_invite_id: inviteId,
        p_user_id: userId,
        p_response_message: null, // Optional parameter
      });

      if (error) {
        invitesLogger.error("[INVITE] RPC call failed", {
          event: "accept_invite_rpc_error",
          inviteId,
          userId,
          error: error?.message,
          code: error?.code,
        });
        throw error;
      }

      invitesLogger.info("[INVITE] Atomic acceptance completed", {
        event: "accept_invite_success",
        inviteId,
        userId,
        result: data,
      });

      return data;
    } catch (error) {
      const { invitesLogger } = require("../config/logger");
      
      // Fallback if function missing OR if it crashes with the known variable error
      if (
        (error.message?.includes("function") &&
          error.message?.includes("does not exist")) ||
        error.message?.includes(
          'record "v_lower_priority_accept" is not assigned yet'
        ) ||
        error.message?.includes("does not exist") ||
        error.code === "42883" // Function does not exist error code
      ) {
        invitesLogger.warn("[INVITE] RPC failed, falling back to manual acceptance", {
          event: "accept_invite_fallback",
          inviteId,
          userId,
          error: error.message,
        });
        logger.warn(
          "RPC failed or missing, falling back to manual acceptance logic: " +
            error.message
        );
        return this._acceptInviteManual(inviteId, userId, userName);
      }
      
      invitesLogger.error("[INVITE] Accept invite error", {
        event: "accept_invite_error",
        inviteId,
        userId,
        error: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      
      handleError(error, "acceptInviteAtomic");
    }
  }

  /**
   * Fallback method for manual invite acceptance when RPC fails
   */
  async _acceptInviteManual(inviteId, userId, userName) {
    try {
      const { invitesLogger } = require("../config/logger");
      
      invitesLogger.info("[INVITE] Starting manual invite acceptance", {
        event: "accept_invite_manual_start",
        inviteId,
        userId,
        userName,
      });

      // 1. Get invite and tee time details
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("invites")
        .select(
          `
            *,
            tee_times (id, max_players)
        `
        )
        .eq("id", inviteId)
        .single();

      if (inviteError) {
        invitesLogger.error("[INVITE] Failed to fetch invite", {
          event: "accept_invite_manual_error",
          inviteId,
          userId,
          error: inviteError?.message,
        });
        throw inviteError;
      }
      
      if (!invite) {
        invitesLogger.error("[INVITE] Invite not found", {
          event: "accept_invite_manual_not_found",
          inviteId,
          userId,
        });
        throw new Error("Invite not found");
      }

      // Check if invite is already accepted or not pending
      if (invite.status !== "pending") {
        invitesLogger.warn("[INVITE] Invite is not pending", {
          event: "accept_invite_manual_not_pending",
          inviteId,
          userId,
          currentStatus: invite.status,
        });
        return {
          success: false,
          reason: "already_responded",
          message: `Invite is already ${invite.status}`,
        };
      }

      const teeTimeId = invite.tee_time_id;
      const maxPlayers = invite.tee_times?.max_players || 4;

      invitesLogger.info("[INVITE] Checking tee time capacity", {
        event: "accept_invite_manual_check_capacity",
        inviteId,
        teeTimeId,
        maxPlayers,
      });

      // 2. Count confirmed participants
      const { count, error: countError } = await supabaseAdmin
        .from("tee_time_participants")
        .select("*", { count: "exact", head: true })
        .eq("tee_time_id", teeTimeId)
        .eq("status", "confirmed");

      if (countError) {
        invitesLogger.error("[INVITE] Failed to count participants", {
          event: "accept_invite_manual_count_error",
          inviteId,
          teeTimeId,
          error: countError?.message,
        });
        throw countError;
      }

      invitesLogger.info("[INVITE] Participant count", {
        event: "accept_invite_manual_count",
        inviteId,
        teeTimeId,
        currentCount: count,
        maxPlayers,
      });

      // 3. Check capacity
      if (count >= maxPlayers) {
        // Full - move to waitlist
        invitesLogger.info("[INVITE] Tee time is full, moving to waitlist", {
          event: "accept_invite_manual_full",
          inviteId,
          teeTimeId,
          count,
          maxPlayers,
        });
        
        await supabaseAdmin
          .from("invites")
          .update({ status: "waitlist" })
          .eq("id", inviteId);

        return { success: false, reason: "full" };
      }

      // 4. Update invite status to accepted
      const { error: updateError } = await supabaseAdmin
        .from("invites")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", inviteId);

      if (updateError) {
        invitesLogger.error("[INVITE] Failed to update invite status", {
          event: "accept_invite_manual_update_error",
          inviteId,
          error: updateError?.message,
        });
        throw updateError;
      }

      invitesLogger.info("[INVITE] Invite status updated to accepted", {
        event: "accept_invite_manual_status_updated",
        inviteId,
      });

      // 5. Add participant
      const { data: participant, error: partError } = await supabaseAdmin
        .from("tee_time_participants")
        .insert({
          tee_time_id: teeTimeId,
          user_id: userId,
          name: userName || invite.invitee_name,
          position: count,
          status: "confirmed",
        })
        .select()
        .single();

      if (partError) {
        invitesLogger.error("[INVITE] Failed to add participant", {
          event: "accept_invite_manual_participant_error",
          inviteId,
          teeTimeId,
          userId,
          error: partError?.message,
          code: partError?.code,
        });
        throw partError;
      }

      invitesLogger.info("[INVITE] Participant added successfully", {
        event: "accept_invite_manual_success",
        inviteId,
        teeTimeId,
        userId,
        participantId: participant.id,
        isFull: count + 1 >= maxPlayers,
      });

      return {
        success: true,
        participantId: participant.id,
        teeTimeId: teeTimeId,
        isFull: count + 1 >= maxPlayers,
      };
    } catch (manualError) {
      const { invitesLogger } = require("../config/logger");
      invitesLogger.error("[INVITE] Manual acceptance error", {
        event: "accept_invite_manual_error",
        inviteId,
        userId,
        error: manualError?.message,
        stack: manualError?.stack,
      });
      handleError(manualError, "_acceptInviteManual");
    }
  }

  async moveToWaitlist(inviteId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ status: "waitlist" })
        .eq("id", inviteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "moveToWaitlist");
    }
  }

  async getWaitlist(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select(
          `
          *,
          users!invites_invitee_user_id_fkey (
            first_name, 
            last_name,
            user_profiles (avatar_url)
          )
        `
        )
        .eq("tee_time_id", teeTimeId)
        .eq("status", "waitlist")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((invite) => {
        const user = invite.users || {};
        const profileData = user.user_profiles;
        const profile = Array.isArray(profileData)
          ? profileData[0] || {}
          : profileData || {};

        delete invite.users;

        return {
          ...invite,
          invitee_first_name: user.first_name,
          invitee_last_name: user.last_name,
          invitee_avatar: profile.avatar_url,
        };
      });
    } catch (error) {
      handleError(error, "getWaitlist");
    }
  }

  async cancelInvite(inviteId, inviterId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .delete()
        .eq("id", inviteId)
        .eq("inviter_id", inviterId)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "cancelInvite");
    }
  }

  async markSmsSent(inviteId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
        })
        .eq("id", inviteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "markSmsSent");
    }
  }

  async isAlreadyInvited(teeTimeId, userId = null, phone = null) {
    try {
      let query = supabaseAdmin
        .from("invites")
        .select("id", { count: "exact", head: true })
        .eq("tee_time_id", teeTimeId);

      if (userId) {
        query = query.eq("invitee_user_id", userId);
      } else {
        query = query.eq("invitee_phone", phone);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data !== null;
    } catch (error) {
      handleError(error, "isAlreadyInvited");
    }
  }

  // Additional methods - add as needed
  async getInvitesByTeeTime(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("tee_time_id", teeTimeId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getInvitesByTeeTime");
    }
  }

  async getSentInvites(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("inviter_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getSentInvites");
    }
  }

  /**
   * Get the single next notification time (either 5m warning or expiration)
   * Returns the ISO string of the next wakeup time, or null if nothing pending.
   */
  /**
   * Get tee times that need organizer "fill spot" warning
   * Fires when: (deadline - buffer) <= now AND deadline > now AND has unfilled spots
   * Buffer is configurable (default 2 minutes for testing)
   */
  async getTeeTimesNeedingOrganizerWarning(bufferMinutes = 2) {
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const bufferMs = bufferMinutes * 60 * 1000;
      const warningThreshold = new Date(now.getTime() + bufferMs).toISOString();

      // Find tee times where:
      // 1. Has pending invites with expires_at <= now + buffer
      // 2. expires_at > now (not yet expired)
      // 3. organizer_fill_warning_sent = false
      // 4. Has unfilled spots
      const { data: invites, error } = await supabaseAdmin
        .from("invites")
        .select(
          `
          tee_time_id,
          expires_at,
          tee_times!inner (
            id,
            creator_id,
            course_name,
            max_players,
            status,
            invite_type,
            organizer_fill_warning_sent,
            tee_date,
            tee_time
          )
        `
        )
        .eq("status", "pending")
        .not("expires_at", "is", null)
        .lte("expires_at", warningThreshold)
        .gt("expires_at", nowIso)
        .eq("tee_times.organizer_fill_warning_sent", false)
        .in("tee_times.status", ["pending", "confirmed"]);

      if (error) throw error;

      // Group by tee_time_id and return unique tee times
      const teeTimeMap = new Map();
      for (const inv of invites || []) {
        if (!teeTimeMap.has(inv.tee_time_id)) {
          teeTimeMap.set(inv.tee_time_id, {
            ...inv.tee_times,
            earliestExpiry: inv.expires_at,
          });
        }
      }

      return Array.from(teeTimeMap.values());
    } catch (error) {
      handleError(error, "getTeeTimesNeedingOrganizerWarning");
      return [];
    }
  }

  /**
   * Mark organizer fill warning as sent for a tee time
   */
  async markOrganizerFillWarningSent(teeTimeId) {
    try {
      const { error } = await supabaseAdmin
        .from("tee_times")
        .update({ organizer_fill_warning_sent: true })
        .eq("id", teeTimeId);

      if (error) throw error;
      return true;
    } catch (error) {
      handleError(error, "markOrganizerFillWarningSent");
      return false;
    }
  }

  /**
   * Get next time we need to check for organizer warnings
   */
  async getNextOrganizerWarningTime(bufferMinutes = 2) {
    try {
      const now = new Date().toISOString();
      const bufferMs = bufferMinutes * 60 * 1000;

      // Find the earliest expires_at where we haven't sent organizer warning
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select(
          `
          expires_at,
          tee_times!inner (
            organizer_fill_warning_sent,
            status
          )
        `
        )
        .eq("status", "pending")
        .not("expires_at", "is", null)
        .gt("expires_at", now)
        .eq("tee_times.organizer_fill_warning_sent", false)
        .in("tee_times.status", ["pending", "confirmed"])
        .order("expires_at", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data?.expires_at) return null;

      // Warning time = expires_at - buffer
      const warningTime = new Date(
        new Date(data.expires_at).getTime() - bufferMs
      );
      return warningTime.toISOString();
    } catch (error) {
      if (error.code !== "PGRST116") {
        handleError(error, "getNextOrganizerWarningTime");
      }
      return null;
    }
  }

  async getNextNotificationTime() {
    try {
      const now = new Date().toISOString();
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60000).toISOString();

      // We need to find the minimum of:
      // 1. expires_at - 5 minutes (where notified_5m = false)
      // 2. expires_at (where notified_expired = false)
      // 3. expires_at - 2 minutes (organizer fill warning)

      // Limit to invites that expire in the future or recently passed
      // We rely on 'pending' status and expires_at presence

      // Since complex OR logic with different sort keys is hard in one PostgREST query,
      // we'll fetch the top candidate for EACH type and return the earliest.

      // Candidate 1: Next 5-minute warning
      // Warning time = expires_at - 5 min.
      // We want the smallest (expires_at) where notified_5m is false
      const { data: nextWarning, error: warnError } = await supabaseAdmin
        .from("invites")
        .select("expires_at")
        .eq("status", "pending")
        .eq("notified_5m", false)
        .not("expires_at", "is", null)
        .gt("expires_at", now) // Warning must be for a future expiry
        .order("expires_at", { ascending: true })
        .limit(1)
        .single();

      // Candidate 2: Next Expiration
      // We want the smallest expires_at where notified_expired is false
      const { data: nextExpiry, error: expError } = await supabaseAdmin
        .from("invites")
        .select("expires_at")
        .eq("status", "pending")
        .eq("notified_expired", false)
        .not("expires_at", "is", null)
        .gt("expires_at", now) // Only future expirations (past ones handled by safety catch)
        .order("expires_at", { ascending: true })
        .limit(1)
        .single();

      const times = [];

      if (nextWarning?.expires_at) {
        const warnTime = new Date(
          new Date(nextWarning.expires_at).getTime() - 5 * 60000
        );
        // Only valid if in future (or very recent past), otherwise it should be processed now
        times.push(warnTime.getTime());
      }

      if (nextExpiry?.expires_at) {
        times.push(new Date(nextExpiry.expires_at).getTime());
      }

      // Also check for organizer fill warning time (2 min before deadline)
      const organizerWarnTime = await this.getNextOrganizerWarningTime(2);
      if (organizerWarnTime) {
        times.push(new Date(organizerWarnTime).getTime());
      }

      if (times.length === 0) return null;

      // Return earliest time
      const nextTime = new Date(Math.min(...times));
      return nextTime.toISOString();
    } catch (error) {
      // Ignore "no rows" error
      if (error && error.code !== "PGRST116") {
        handleError(error, "getNextNotificationTime");
      }
      return null;
    }
  }

  /**
   * Process and return all notifications due RIGHT NOW
   * This is atomic-like: fetches AND updates state to prevent double-sending
   */
  async processDueNotifications() {
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const fiveMinsFromNow = new Date(now.getTime() + 5 * 60000).toISOString();

      const results = {
        warnings: [],
        expirations: [],
      };

      // 1. Process 5-minute warnings
      // Find pending invites where (expires_at <= now + 5m) AND notified_5m = false
      const { data: warnings, error: warnError } = await supabaseAdmin
        .from("invites")
        .update({ notified_5m: true }) // Mark as processed immediately
        .eq("status", "pending")
        .eq("notified_5m", false)
        .not("expires_at", "is", null)
        .lte("expires_at", fiveMinsFromNow)
        .gt("expires_at", nowIso) // Don't warn if already expired
        .select("*");

      if (warnError) throw warnError;
      if (warnings) results.warnings = warnings;

      // 2. Process Expirations (Status change to 'expired')
      // Find pending invites where expires_at <= now AND notified_expired = false
      const { data: expired, error: expError } = await supabaseAdmin
        .from("invites")
        .update({
          status: "expired",
          notified_expired: true,
        })
        .eq("status", "pending")
        .eq("notified_expired", false) // Ensure we haven't processed this
        .not("expires_at", "is", null)
        .lte("expires_at", nowIso)
        .select("*");

      if (expError) throw expError;
      if (expired) results.expirations = expired;

      return results;
    } catch (error) {
      handleError(error, "processDueNotifications");
      return { warnings: [], expirations: [] };
    }
  }

  /**
   * Safety catch for missed deadlines or stale states
   * Runs periodically to sweep up anything missed by the event scheduler
   */
  async cleanupMissedDeadlines() {
    // Just call processDueNotifications - it handles "lte now" logic which covers past events
    return this.processDueNotifications();
  }

  // Deprecated: old method replaced by processDueNotifications
  async expireOldInvites() {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ status: "expired" })
        .eq("status", "pending")
        .not("expires_at", "is", null)
        .lt("expires_at", new Date().toISOString())
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "expireOldInvites");
    }
  }

  async moveRemainingToWaitlist(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ status: "waitlist" })
        .eq("tee_time_id", teeTimeId)
        .eq("status", "pending")
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "moveRemainingToWaitlist");
    }
  }

  async checkAllInvitesResponded(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("status")
        .eq("tee_time_id", teeTimeId);

      if (error) throw error;

      const pendingCount = data.filter((i) => i.status === "pending").length;
      const respondedCount = data.filter((i) =>
        ["accepted", "declined", "expired"].includes(i.status)
      ).length;

      return {
        allResponded: pendingCount === 0 && data.length > 0,
        pendingCount,
        respondedCount,
        totalCount: data.length,
      };
    } catch (error) {
      handleError(error, "checkAllInvitesResponded");
    }
  }

  async createInviteResponse(responseData) {
    const {
      inviteId,
      userId,
      response,
      responseMessage,
      respondedVia,
      ipAddress,
      deviceInfo,
    } = responseData;

    try {
      const { data, error } = await supabaseAdmin
        .from("invite_responses")
        .insert({
          invite_id: inviteId,
          user_id: userId || null,
          response,
          response_message: responseMessage || null,
          responded_via: respondedVia || "app",
          ip_address: ipAddress || null,
          device_info: deviceInfo || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "createInviteResponse");
    }
  }

  async getInviteResponses(inviteId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invite_responses")
        .select("*")
        .eq("invite_id", inviteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getInviteResponses");
    }
  }

  async getResponseStats(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invite_responses")
        .select("response")
        .eq("invites.tee_time_id", teeTimeId);

      if (error) throw error;

      const stats = { accepted: 0, declined: 0, maybe: 0, waitlist: 0 };
      (data || []).forEach((row) => {
        if (stats.hasOwnProperty(row.response)) {
          stats[row.response]++;
        }
      });
      return stats;
    } catch (error) {
      handleError(error, "getResponseStats");
    }
  }

  async getInvitesNeedingSms(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("tee_time_id", teeTimeId)
        .is("invitee_user_id", null)
        .not("invitee_phone", "is", null)
        .eq("sms_sent", false);

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getInvitesNeedingSms");
    }
  }

  async getInviteByPhone(teeTimeId, phone) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("tee_time_id", teeTimeId)
        .eq("invitee_phone", phone)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "getInviteByPhone");
    }
  }

  async getWaitlistUsersForNotification(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("id, invitee_user_id, invitee_phone, invitee_name")
        .eq("tee_time_id", teeTimeId)
        .eq("status", "waitlist")
        .order("position", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getWaitlistUsersForNotification");
    }
  }

  async getPendingInviteUsers(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("id, invitee_user_id, invitee_phone, invitee_name")
        .eq("tee_time_id", teeTimeId)
        .eq("status", "pending")
        .order("position", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getPendingInviteUsers");
    }
  }

  async reactivateWaitlistInvites(teeTimeId, expiresAt = null) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ status: "pending", expires_at: expiresAt })
        .eq("tee_time_id", teeTimeId)
        .eq("status", "waitlist")
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "reactivateWaitlistInvites");
    }
  }

  async setFCFSDeadline(teeTimeId, deadline) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ expires_at: deadline })
        .eq("tee_time_id", teeTimeId)
        .eq("status", "pending")
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "setFCFSDeadline");
    }
  }

  async getInvitesExpiringSoon(hoursUntilExpiry) {
    try {
      const futureTime = new Date(
        Date.now() + hoursUntilExpiry * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("status", "pending")
        .not("expires_at", "is", null)
        .gte("expires_at", new Date().toISOString())
        .lte("expires_at", futureTime)
        .eq("deadline_notification_sent", false);

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getInvitesExpiringSoon");
    }
  }

  async markDeadlineNotificationSent(inviteId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ deadline_notification_sent: true })
        .eq("id", inviteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "markDeadlineNotificationSent");
    }
  }

  async getPendingInvitesByTeeTime(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("tee_time_id", teeTimeId)
        .eq("status", "pending")
        .order("position", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getPendingInvitesByTeeTime");
    }
  }

  async createBulkInvitesWithExpiry(teeTimeId, inviterId, invitees) {
    try {
      // Validate and potentially fix user IDs
      const validatedInvitees = await Promise.all(
        invitees.map(async (inv) => {
          let userId = inv.userId || null;
          
          if (userId) {
            // Check if userId exists in users table
            const { data: userCheck, error: userError } = await supabaseAdmin
              .from("users")
              .select("id")
              .eq("id", userId)
              .is("deleted_at", null)
              .maybeSingle();
            
            if (userError) {
              invitesLogger.warn("[INVITE] Error checking user ID", {
                event: "user_id_check_error",
                userId,
                error: userError?.message,
              });
            } else if (!userCheck) {
              // User ID doesn't exist - might be a roster entry ID, try to look it up
              invitesLogger.warn("[INVITE] User ID not found in users table, checking roster", {
                event: "user_id_not_found",
                userId,
                inviteeName: inv.name,
              });
              
              const { data: rosterEntry } = await supabaseAdmin
                .from("roster")
                .select("contact_user_id")
                .eq("id", userId)
                .eq("user_id", inviterId)
                .maybeSingle();
              
              if (rosterEntry?.contact_user_id) {
                invitesLogger.info("[INVITE] Found contact_user_id from roster entry", {
                  event: "user_id_fixed_from_roster",
                  originalId: userId,
                  fixedId: rosterEntry.contact_user_id,
                });
                userId = rosterEntry.contact_user_id;
              } else {
                invitesLogger.error("[INVITE] User ID not found in users or roster", {
                  event: "user_id_invalid",
                  userId,
                  inviteeName: inv.name,
                });
                userId = null; // Clear invalid ID
              }
            }
          }
          
          return {
            ...inv,
            userId,
          };
        })
      );

      const inviteRecords = validatedInvitees.map((inv, i) => ({
        tee_time_id: teeTimeId,
        inviter_id: inviterId,
        invitee_user_id: inv.userId || null,
        invitee_phone: inv.phone || null,
        invitee_name: inv.name || null,
        position: inv.position || i,
        expires_at: inv.expiresAt || null,
      }));

      invitesLogger.info("[INVITE] Creating bulk invites with expiry", {
        event: "bulk_invites_with_expiry_create",
        teeTimeId,
        inviterId,
        totalInvitees: inviteRecords.length,
        withUserId: inviteRecords.filter(r => r.invitee_user_id).length,
        withPhone: inviteRecords.filter(r => r.invitee_phone).length,
        sampleInvitee: inviteRecords[0] ? {
          hasUserId: !!inviteRecords[0].invitee_user_id,
          userId: inviteRecords[0].invitee_user_id,
          hasPhone: !!inviteRecords[0].invitee_phone,
          name: inviteRecords[0].invitee_name,
          expiresAt: inviteRecords[0].expires_at,
        } : null,
      });

      logger.info(`Creating ${inviteRecords.length} invites with expiry for tee time ${teeTimeId}`, {
        withUserId: inviteRecords.filter(r => r.invitee_user_id).length,
        withPhone: inviteRecords.filter(r => r.invitee_phone).length,
        sampleInvitee: invitees[0] ? { hasUserId: !!invitees[0].userId, hasPhone: !!invitees[0].phone } : null,
      });

      const { data, error } = await supabaseAdmin
        .from("invites")
        .insert(inviteRecords)
        .select();

      if (error) throw error;
      
      invitesLogger.info("[INVITE] Bulk invites with expiry created successfully", {
        event: "bulk_invites_with_expiry_created",
        teeTimeId,
        inviteCount: (data || []).length,
        invites: (data || []).map(inv => ({
          inviteId: inv.id,
          inviteeUserId: inv.invitee_user_id,
          inviteePhone: inv.invitee_phone,
          inviteeName: inv.invitee_name,
          status: inv.status,
          expiresAt: inv.expires_at,
        })),
      });
      
      logger.info(`Successfully created ${(data || []).length} invites with expiry`);
      return data || [];
    } catch (error) {
      invitesLogger.error("[INVITE] Error creating bulk invites with expiry", {
        event: "bulk_invites_with_expiry_error",
        teeTimeId,
        error: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      handleError(error, "createBulkInvitesWithExpiry");
    }
  }

  async getNextPendingInvite(teeTimeId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("tee_time_id", teeTimeId)
        .eq("status", "pending")
        .is("expires_at", null)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      handleError(error, "getNextPendingInvite");
    }
  }

  async activateInvite(inviteId, expiresAt) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invites")
        .update({ expires_at: expiresAt })
        .eq("id", inviteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error, "activateInvite");
    }
  }

  async getUserResponseHistory(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("invite_responses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, "getUserResponseHistory");
    }
  }
}

module.exports = new InviteRepository();

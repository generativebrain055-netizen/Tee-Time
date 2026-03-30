/**
 * When a tee time still has open spots but not enough pending invites
 * (awaiting / queued / not-yet-expired), nudge the organizer to invite more.
 * Opens SelectOnDeck ("Invite more players") from the app.
 */
const teeTimeRepository = require("../repositories/teeTimeRepository");
const inviteRepository = require("../repositories/inviteRepository");
const notificationService = require("./notificationService");
const logger = require("../config/logger");

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours between nudges per tee time

function countPipelineInvites(pendingRows) {
  const now = Date.now();
  return pendingRows.filter((inv) => {
    if (!inv.expires_at) return true;
    return new Date(inv.expires_at).getTime() > now;
  }).length;
}

async function maybeNotifyOrganizerInsufficientPipeline(teeTimeId, options = {}) {
  try {
    const teeTime = await teeTimeRepository.getTeeTimeById(teeTimeId);
    if (!teeTime || teeTime.status === "cancelled" || teeTime.status === "completed") {
      return;
    }

    // Open tee times fill via the community board, not a closed invite list
    if (teeTime.invite_type === "open") {
      return;
    }

    const participantCount = await teeTimeRepository.getParticipantCount(teeTimeId);
    const spotsRemaining = teeTime.max_players - participantCount;
    if (spotsRemaining <= 0) {
      return;
    }

    const pending = await inviteRepository.getPendingInvitesByTeeTime(teeTimeId);
    const pipelineCount = countPipelineInvites(pending);

    if (pipelineCount >= spotsRemaining) {
      return;
    }

    const now = new Date();
    if (!options.skipCooldown) {
      const last = teeTime.organizer_pipeline_nudge_at;
      if (last && now.getTime() - new Date(last).getTime() < COOLDOWN_MS) {
        return;
      }
    }

    await notificationService.notifyOrganizerInviteMorePlayers(
      teeTime.creator_id,
      teeTime,
      spotsRemaining,
      pipelineCount
    );
    await teeTimeRepository.setOrganizerPipelineNudgeAt(teeTimeId, now.toISOString());
  } catch (e) {
    logger.error("[organizerPipelineNudge] Error", e);
  }
}

module.exports = {
  maybeNotifyOrganizerInsufficientPipeline,
  countPipelineInvites,
};

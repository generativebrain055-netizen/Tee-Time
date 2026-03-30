const { formatDateLocal } = require("./dateUtils");

/**
 * Normalize Supabase social_rate_logs rows (with optional nested tee_times) for API clients.
 */
function formatSocialRateHistoryEntries(history) {
  return (history || []).map((entry) => {
    const tt = entry.tee_times;
    const t = tt && !Array.isArray(tt) ? tt : Array.isArray(tt) ? tt[0] : null;
    const courseName = entry.course_name ?? t?.course_name;
    const teeDate = entry.tee_date ?? t?.tee_date;
    const teeTimeVal = entry.tee_time ?? t?.tee_time;
    return {
      id: entry.id,
      delta: entry.delta,
      previousScore: entry.previous_score,
      newScore: entry.new_score,
      reason: entry.reason,
      reasonDetails: entry.reason_details,
      teeTime:
        entry.tee_time_id && (courseName || teeDate || teeTimeVal || entry.tee_time_id)
          ? {
              id: entry.tee_time_id,
              courseName: courseName || "",
              date: teeDate ? formatDateLocal(teeDate) : "",
              time: teeTimeVal ? String(teeTimeVal) : "",
            }
          : null,
      createdAt: entry.created_at,
    };
  });
}

module.exports = { formatSocialRateHistoryEntries };

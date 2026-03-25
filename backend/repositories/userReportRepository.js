const { supabaseAdmin, handleError } = require("../config/supabase");

const LIST_COLS =
  "id, reporter_id, reported_user_id, reason, description, status, admin_notes, resolved_at, created_at, updated_at, report_source, support_category, support_subject, email_delivered, email_error";

/**
 * PostgREST: use * as ILIKE/LIKE wildcard in filter strings (not % — % breaks URL / parser).
 * Double-quote so values with . , : ( ) don't split the filter. See postgrest.org URL grammar.
 */
function postgrestIlikePattern(sanitizedText) {
  const inner = String(sanitizedText)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  return `"*${inner}*"`;
}

/**
 * True when error indicates pre-migration schema (012 not applied) or NOT NULL on reported_user_id.
 */
function shouldTryLegacyAppSupportInsert(error) {
  if (!error) return false;
  const code = error.code;
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "PGRST204" ||
    code === "42703" ||
    code === "23502" ||
    msg.includes("report_source") ||
    msg.includes("support_category") ||
    msg.includes("support_subject") ||
    msg.includes("email_delivered") ||
    msg.includes("email_error") ||
    (msg.includes("null value") && msg.includes("reported_user_id")) ||
    msg.includes("violates not-null constraint")
  );
}

/**
 * List user reports (for admin)
 * @param {Object} filters - status, reported_user_id, report_source ('user_vs_user' | 'app_support'), limit, offset, search (substring must appear in reason, description, admin_notes, or support fields)
 */
const list = async (filters = {}) => {
  try {
    const searchRaw = typeof filters.search === "string" ? filters.search.trim() : "";
    // Avoid commas in ilike patterns (PostgREST uses comma as OR separator in .or())
    const sanitizedText =
      searchRaw.length > 0
        ? searchRaw
            .replace(/%/g, "")
            .replace(/_/g, "")
            .replace(/,/g, " ")
            .trim()
        : "";

    // Non-empty search but nothing left to match → no rows (previously we omitted .or() and returned everything)
    if (searchRaw.length > 0 && sanitizedText.length === 0) {
      return { data: [], total: 0 };
    }

    let query = supabaseAdmin
      .from("user_reports")
      .select(LIST_COLS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.reported_user_id) query = query.eq("reported_user_id", filters.reported_user_id);

    if (filters.report_source === "app_support") {
      query = query.or("report_source.eq.app_support,reason.like.app_support:*");
    } else if (filters.report_source === "user_vs_user") {
      query = query.eq("report_source", "user_vs_user").not("reason", "like", "app_support:*");
    }

    if (sanitizedText.length > 0) {
      const term = postgrestIlikePattern(sanitizedText);
      query = query.or(
        [
          `reason.ilike.${term}`,
          `description.ilike.${term}`,
          `admin_notes.ilike.${term}`,
          `support_subject.ilike.${term}`,
          `support_category.ilike.${term}`,
        ].join(","),
      );
    }

    const limit = Math.min(filters.limit || 50, 200);
    const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count ?? 0 };
  } catch (err) {
    handleError(err, "userReportRepository.list");
  }
};

/**
 * Insert Help & Support submission (mobile app).
 * Uses full schema when migration 012 is applied; falls back to legacy row if columns are missing or reported_user_id is still NOT NULL.
 * @returns {Promise<{ id: string, legacyAppSupport?: boolean }>}
 */
const createAppSupport = async ({ reporter_id, category, subject, message }) => {
  const modernPayload = {
    reporter_id,
    reported_user_id: null,
    report_source: "app_support",
    reason: "app_support",
    support_category: category,
    support_subject: subject || "",
    description: message,
    status: "pending",
    email_delivered: false,
  };

  const modern = await supabaseAdmin.from("user_reports").insert(modernPayload).select("id").single();
  if (!modern.error) {
    return { id: modern.data.id };
  }

  if (!shouldTryLegacyAppSupportInsert(modern.error)) {
    handleError(modern.error, "userReportRepository.createAppSupport");
  }

  const reason = `app_support:${category}`.slice(0, 100);
  const description = `Subject: ${subject || ""}\n\n${message}`;
  const legacyPayload = {
    reporter_id,
    reported_user_id: reporter_id,
    reason,
    description,
    status: "pending",
  };

  const legacy = await supabaseAdmin.from("user_reports").insert(legacyPayload).select("id").single();
  if (legacy.error) {
    handleError(legacy.error, "userReportRepository.createAppSupport.legacy");
  }

  return { id: legacy.data.id, legacyAppSupport: true };
};

/**
 * Update email delivery outcome (ignored if columns missing or row is legacy)
 */
const setEmailResult = async (id, { delivered, emailError }) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_reports")
      .update({
        email_delivered: !!delivered,
        email_error: emailError || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    const logger = require("../config/logger");
    logger.warn("[userReportRepository.setEmailResult] skipped", { id, message: err?.message, code: err?.code });
    return null;
  }
};

/**
 * Get one report by id
 */
const getById = async (id) => {
  try {
    const { data, error } = await supabaseAdmin.from("user_reports").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (error) {
    handleError(error, "userReportRepository.getById");
  }
};

/**
 * Update report status and admin notes
 */
const updateStatus = async (id, updates) => {
  try {
    const { status, admin_notes } = updates;
    const body = { updated_at: new Date().toISOString() };
    if (status !== undefined) body.status = status;
    if (admin_notes !== undefined) body.admin_notes = admin_notes;
    if (status === "resolved" || status === "dismissed") {
      body.resolved_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin.from("user_reports").update(body).eq("id", id).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "userReportRepository.updateStatus");
  }
};

module.exports = { list, getById, updateStatus, createAppSupport, setEmailResult };

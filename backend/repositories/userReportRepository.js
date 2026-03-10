const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * List user reports (for admin)
 */
const list = async (filters = {}) => {
  try {
    const cols = "id, reporter_id, reported_user_id, reason, description, status, admin_notes, resolved_at, created_at, updated_at";
    let query = supabaseAdmin
      .from("user_reports")
      .select(cols, { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.reported_user_id) query = query.eq("reported_user_id", filters.reported_user_id);
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
 * Get one report by id
 */
const getById = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_reports")
      .select("*")
      .eq("id", id)
      .single();
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
    const { data, error } = await supabaseAdmin
      .from("user_reports")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, "userReportRepository.updateStatus");
  }
};

module.exports = { list, getById, updateStatus };

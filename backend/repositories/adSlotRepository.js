const { supabaseAdmin, handleError } = require("../config/supabase");

const VALID_SLOT_KEYS = ["loading_screen", "banner_1", "banner_2", "banner_3"];
const SLOT_DEFAULTS = {
  loading_screen: { display_name: "Sign up / Sign in page", slot_type: "loading_screen", sort_order: 1 },
  banner_1: { display_name: "Chatting page", slot_type: "banner", sort_order: 2 },
  banner_2: { display_name: "Tee time type selection (tee time creating)", slot_type: "banner", sort_order: 3 },
  banner_3: { display_name: "Calendar view page", slot_type: "banner", sort_order: 4 },
};

/**
 * Ad slot repository – fixed placements: loading_screen, banner_1, banner_2, banner_3
 */

async function listAll() {
  try {
    const { data, error } = await supabaseAdmin
      .from("ad_slots")
      .select("id, slot_key, display_name, alt_text, image_url, link_url, active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      label: row.display_name ?? "",
      description: row.alt_text ?? null,
    }));
  } catch (err) {
    handleError(err, "adSlotRepository.listAll");
    return [];
  }
}

async function getBySlotKey(slotKey) {
  try {
    const { data, error } = await supabaseAdmin
      .from("ad_slots")
      .select("*")
      .eq("slot_key", slotKey)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    return { ...data, label: data.display_name ?? "", description: data.alt_text ?? null };
  } catch (err) {
    handleError(err, "adSlotRepository.getBySlotKey");
    return null;
  }
}

async function listActiveForApp() {
  try {
    const { data, error } = await supabaseAdmin
      .from("ad_slots")
      .select("slot_key, image_url, alt_text, link_url")
      .eq("active", true)
      .not("image_url", "is", null)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => ({
      slot_key: row.slot_key,
      image_url: row.image_url,
      link_url: row.link_url,
      description: row.alt_text ?? null,
    }));
  } catch (err) {
    handleError(err, "adSlotRepository.listActiveForApp");
    return [];
  }
}

async function updateBySlotKey(slotKey, payload) {
  try {
    const updates = {};
    if (payload.description !== undefined) updates.alt_text = payload.description == null || payload.description === "" ? null : String(payload.description).trim();
    if (payload.image_url !== undefined) updates.image_url = payload.image_url == null || payload.image_url === "" ? null : String(payload.image_url).trim();
    if (payload.link_url !== undefined) updates.link_url = payload.link_url == null || payload.link_url === "" ? null : String(payload.link_url).trim();
    if (typeof payload.active === "boolean") updates.active = payload.active;
    if (typeof payload.sort_order === "number") updates.sort_order = payload.sort_order;
    if (Object.keys(updates).length === 0) {
      const existing = await getBySlotKey(slotKey);
      return existing;
    }
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("ad_slots")
      .update(updates)
      .eq("slot_key", slotKey)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return { ...data, label: data.display_name ?? "", description: data.alt_text ?? null };
    // No row matched – slot may not exist yet (seed not run). Upsert so one update succeeds.
    const defaults = SLOT_DEFAULTS[slotKey] || { display_name: slotKey, slot_type: "banner", sort_order: 0 };
    const row = {
      slot_key: slotKey,
      display_name: updates.display_name ?? defaults.display_name,
      slot_type: defaults.slot_type,
      alt_text: updates.alt_text ?? null,
      image_url: updates.image_url ?? null,
      link_url: updates.link_url ?? null,
      active: updates.active !== undefined ? updates.active : true,
      sort_order: updates.sort_order ?? defaults.sort_order,
      updated_at: updates.updated_at,
    };
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("ad_slots")
      .upsert(row, { onConflict: "slot_key", ignoreDuplicates: false })
      .select()
      .single();
    if (insertErr) throw insertErr;
    if (!inserted) return null;
    return { ...inserted, label: inserted.display_name ?? "", description: inserted.alt_text ?? null };
  } catch (err) {
    handleError(err, "adSlotRepository.updateBySlotKey");
    return null;
  }
}

module.exports = {
  listAll,
  getBySlotKey,
  listActiveForApp,
  updateBySlotKey,
};

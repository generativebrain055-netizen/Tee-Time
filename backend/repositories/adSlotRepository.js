const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Ad slot repository – fixed placements: loading_screen, banner_1, banner_2, banner_3
 */

async function listAll() {
  try {
    const { data, error } = await supabaseAdmin
      .from("ad_slots")
      .select("id, slot_key, label, image_url, link_url, active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data || [];
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
    return data || null;
  } catch (err) {
    handleError(err, "adSlotRepository.getBySlotKey");
    return null;
  }
}

async function listActiveForApp() {
  try {
    const { data, error } = await supabaseAdmin
      .from("ad_slots")
      .select("slot_key, image_url, link_url")
      .eq("active", true)
      .not("image_url", "is", null)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    handleError(err, "adSlotRepository.listActiveForApp");
    return [];
  }
}

async function updateBySlotKey(slotKey, payload) {
  try {
    const allowed = ["label", "image_url", "link_url", "active", "sort_order"];
    const updates = {};
    for (const k of allowed) {
      if (payload[k] !== undefined) updates[k] = payload[k];
    }
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
      .single();
    if (error) throw error;
    return data;
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

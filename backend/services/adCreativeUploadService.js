const { supabaseAdmin, handleError } = require("../config/supabase");
const crypto = require("crypto");
const logger = require("../config/logger");

const BUCKET_NAME = "ad-creatives";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB per creative
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VALID_SLOT_KEYS = ["loading_screen", "banner_1", "banner_2", "banner_3"];

/**
 * Parse base64 image (data URL or raw base64)
 */
function parseBase64Image(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) {
    const rawMatch = dataUrl.match(/^([A-Za-z0-9+/=]+)$/);
    if (rawMatch) {
      try {
        const buffer = Buffer.from(dataUrl, "base64");
        if (buffer.length > 0 && buffer.length <= MAX_SIZE_BYTES) return { buffer, mimeType: "image/jpeg" };
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  const [, mimeType, base64Data] = match;
  if (!ALLOWED_TYPES.includes(mimeType)) return null;
  try {
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_SIZE_BYTES) return null;
    return { buffer, mimeType };
  } catch (e) {
    return null;
  }
}

function getExtension(mimeType) {
  const map = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  return map[mimeType] || "jpg";
}

/**
 * Upload ad creative for a slot. Replaces any existing file for that slot (upload with same path prefix = overwrite if we use upsert).
 * @param {string} slotKey - loading_screen | banner_1 | banner_2 | banner_3
 * @param {string} base64Image - Data URL or raw base64
 * @returns {Promise<string>} Public URL
 */
async function uploadAdCreative(slotKey, base64Image) {
  if (!VALID_SLOT_KEYS.includes(slotKey)) {
    throw new Error("Invalid slot key");
  }
  const parsed = parseBase64Image(base64Image);
  if (!parsed) {
    throw new Error("Invalid image format. Use JPEG, PNG, WebP, or GIF (max 2MB).");
  }
  const { buffer, mimeType } = parsed;
  const ext = getExtension(mimeType);
  const id = crypto.randomBytes(8).toString("hex");
  const path = `${slotKey}/${id}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    logger.error("Ad creative upload failed:", error);
    throw new Error(error.message || "Failed to upload ad creative");
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Delete object from storage by public URL (if it belongs to our bucket).
 * @param {string} publicUrl - Full public URL of the object
 * @returns {Promise<boolean>} true if deleted, false if not our URL or not found
 */
async function deleteAdCreativeByUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== "string") return false;
  try {
    const url = new URL(publicUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/ad-creatives\/(.+)$/);
    if (!pathMatch) return false;
    const objectPath = decodeURIComponent(pathMatch[1]);
    const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([objectPath]);
    if (error) {
      logger.warn("Ad creative delete failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    logger.warn("Ad creative delete error:", e.message);
    return false;
  }
}

async function ensureBucketExists() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true });
      if (error) logger.warn("Could not create ad-creatives bucket:", error.message);
    }
  } catch (e) {
    logger.warn("Ad-creatives bucket check failed:", e.message);
  }
}

module.exports = {
  uploadAdCreative,
  deleteAdCreativeByUrl,
  ensureBucketExists,
  VALID_SLOT_KEYS,
};

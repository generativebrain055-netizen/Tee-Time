const { supabaseAdmin, handleError } = require("../config/supabase");
const crypto = require("crypto");
const logger = require("../config/logger");

const BUCKET_NAME = "chat-images";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB for chat images
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Parse base64 image (data URL or raw base64)
 * @param {string} data - "data:image/jpeg;base64,..." or raw base64
 * @returns {{ buffer: Buffer, mimeType: string } | null}
 */
function parseBase64Image(data) {
  if (!data || typeof data !== "string") return null;
  const match = data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
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
  const rawMatch = data.match(/^([A-Za-z0-9+/=]+)$/);
  if (rawMatch) {
    try {
      const buffer = Buffer.from(data, "base64");
      if (buffer.length > 0 && buffer.length <= MAX_SIZE_BYTES) {
        return { buffer, mimeType: "image/jpeg" };
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getExtension(mimeType) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] || "jpg";
}

/**
 * Upload chat image to Supabase Storage
 * @param {string} base64Image - Data URL or raw base64
 * @param {string} conversationId - For path organization
 * @param {string} userId - Sender user id
 * @returns {Promise<string>} Public URL
 */
async function uploadChatImage(base64Image, conversationId, userId) {
  const parsed = parseBase64Image(base64Image);
  if (!parsed) {
    throw new Error("Invalid image format. Use JPEG, PNG, WebP, or GIF (max 10MB).");
  }
  const { buffer, mimeType } = parsed;
  const ext = getExtension(mimeType);
  const id = crypto.randomBytes(12).toString("hex");
  const path = `conversations/${conversationId}/${userId}/${id}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    logger.error("Chat image upload failed:", error);
    throw new Error(error.message || "Failed to upload image");
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.path);
  return publicUrl;
}

async function ensureBucketExists() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      if (error) logger.warn("Could not create chat-images bucket:", error.message);
    }
  } catch (e) {
    logger.warn("Chat images bucket check failed:", e.message);
  }
}

module.exports = {
  uploadChatImage,
  ensureBucketExists,
};

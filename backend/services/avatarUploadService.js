const { supabaseAdmin, handleError } = require("../config/supabase");
const crypto = require("crypto");
const logger = require("../config/logger");

const BUCKET_NAME = "avatars";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Parse base64 image data URL
 * @param {string} dataUrl - e.g. "data:image/jpeg;base64,/9j/4AAQ..."
 * @returns {{ buffer: Buffer, mimeType: string } | null}
 */
const parseBase64Image = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) {
    // Try raw base64
    const rawMatch = dataUrl.match(/^([A-Za-z0-9+/=]+)$/);
    if (rawMatch) {
      try {
        const buffer = Buffer.from(dataUrl, "base64");
        if (buffer.length > 0 && buffer.length <= MAX_SIZE_BYTES) {
          return { buffer, mimeType: "image/jpeg" };
        }
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
};

/**
 * Get file extension from mime type
 */
const getExtension = (mimeType) => {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mimeType] || "jpg";
};

/**
 * Upload profile photo to Supabase Storage
 * @param {string} base64Image - Data URL or raw base64
 * @param {string} [userId] - Optional user ID for path (for updates)
 * @returns {Promise<string>} Public URL
 */
const uploadAvatar = async (base64Image, userId = null) => {
  const parsed = parseBase64Image(base64Image);
  if (!parsed) {
    throw new Error("Invalid image format. Use JPEG, PNG, or WebP (max 5MB).");
  }

  const { buffer, mimeType } = parsed;
  const ext = getExtension(mimeType);
  const id = crypto.randomBytes(12).toString("hex");
  const prefix = userId ? `users/${userId}` : "onboarding";
  const path = `${prefix}/${id}.${ext}`;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      logger.error("Avatar upload failed:", error);
      throw new Error(error.message || "Failed to upload avatar");
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.path);
    return publicUrl;
  } catch (error) {
    handleError(error, "upload avatar");
  }
};

/**
 * Ensure avatars bucket exists (call on startup if needed)
 */
const ensureBucketExists = async () => {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      if (error) {
        logger.warn("Could not create avatars bucket:", error.message);
      }
    }
  } catch (e) {
    logger.warn("Bucket check failed:", e.message);
  }
};

module.exports = {
  uploadAvatar,
  ensureBucketExists,
  parseBase64Image,
};

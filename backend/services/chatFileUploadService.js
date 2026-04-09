const { supabaseAdmin } = require("../config/supabase");
const crypto = require("crypto");
const logger = require("../config/logger");

const BUCKET_NAME = "chat-images";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file

const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extForMime(mime) {
  const m = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return m[mime] || "bin";
}

function sanitizeFileName(name) {
  if (!name || typeof name !== "string") return "file";
  const s = name.replace(/[/\\?%*:|"<>]/g, "_").trim().slice(0, 200);
  return s || "file";
}

function parseBase64File(data, declaredMime) {
  if (!data || typeof data !== "string") return null;

  if (data.startsWith("data:")) {
    const semi = data.indexOf(";base64,");
    if (semi === -1) return null;
    const mimeType = data.slice(5, semi).trim().split(";")[0];
    if (!ALLOWED_MIME.has(mimeType)) return null;
    const b64 = data.slice(semi + 8);
    try {
      const buffer = Buffer.from(b64, "base64");
      if (buffer.length === 0 || buffer.length > MAX_SIZE_BYTES) return null;
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }

  const mimeType =
    typeof declaredMime === "string" && declaredMime.trim()
      ? declaredMime.trim()
      : "";
  if (!mimeType || !ALLOWED_MIME.has(mimeType)) return null;
  try {
    const buffer = Buffer.from(data, "base64");
    if (buffer.length === 0 || buffer.length > MAX_SIZE_BYTES) return null;
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

/**
 * Upload a chat file to Supabase Storage (same public bucket as chat images).
 * @returns {Promise<{ url: string, name: string, mime: string }>}
 */
async function uploadChatFile(base64File, fileName, fileMime, conversationId, userId) {
  const parsed = parseBase64File(base64File, fileMime);
  if (!parsed) {
    throw new Error(
      "Invalid or unsupported file. Allowed: PDF, Word, Excel, CSV, text, zip, common images (max 10MB)."
    );
  }
  const { buffer, mimeType } = parsed;
  const safeName = sanitizeFileName(fileName);
  const ext = extForMime(mimeType);
  const id = crypto.randomBytes(12).toString("hex");
  const path = `files/${conversationId}/${userId}/${id}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    logger.error("Chat file upload failed:", error);
    throw new Error(error.message || "Failed to upload file");
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return {
    url: publicUrl,
    name: safeName,
    mime: mimeType,
  };
}

module.exports = {
  uploadChatFile,
};

const { createClient } = require("@supabase/supabase-js");
const logger = require("./logger");

// Expect process.env to be already loaded by server.js (backend/.env). Standalone scripts must load dotenv before requiring this file.

/**
 * Supabase Client Configuration
 * Uses REST API for all database interactions
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

// Public client (uses anon key, respects RLS)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Admin client (uses service role key, bypasses RLS) - use for server-side operations
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;

/**
 * Test Supabase connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("count")
      .limit(1);

    if (error) throw error;
    logger.info("[SUPABASE] Connection successful");
    return true;
  } catch (error) {
    logger.error("[SUPABASE] Connection failed", error.message);
    return false;
  }
};

/**
 * Helper to handle Supabase errors consistently
 * @param {Object} error - Supabase error object
 * @param {string} operation - Description of the operation
 */
const handleError = (error, operation) => {
  logger.error(`Supabase error during ${operation}`, {
    message: error?.message,
    code: error?.code,
    hint: error?.hint,
    details: error?.details,
    constraint: error?.constraint,
  });
  const err = new Error(error.message || `Database error during ${operation}`);
  err.code = error.code;
  err.details = error.details;
  err.hint = error.hint;
  err.constraint = error.constraint;
  if (error.statusCode != null) err.statusCode = error.statusCode;
  if (error.isOperational != null) err.isOperational = error.isOperational;
  throw err;
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  handleError,
};

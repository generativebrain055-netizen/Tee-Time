const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

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
    console.log("[SUPABASE] Connection successful");
    return true;
  } catch (error) {
    console.error("[SUPABASE] Connection failed:", error.message);
    return false;
  }
};

/**
 * Helper to handle Supabase errors consistently
 * @param {Object} error - Supabase error object
 * @param {string} operation - Description of the operation
 */
const handleError = (error, operation) => {
  console.error(`Supabase error during ${operation}:`, error);
  const err = new Error(error.message || `Database error during ${operation}`);
  err.code = error.code;
  err.details = error.details;
  err.hint = error.hint;
  throw err;
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  handleError,
};

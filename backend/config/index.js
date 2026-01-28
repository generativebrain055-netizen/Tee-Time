/**
 * Config Index
 * Re-exports all configuration modules for cleaner imports
 */

const database = require("./database");
const logger = require("./logger");
const supabase = require("./supabase");

module.exports = {
  database,
  logger,
  supabase,
};

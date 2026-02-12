/**
 * Database Configuration - Backward Compatibility Layer
 * 
 * DEPRECATED: This file provides backward compatibility for services
 * that haven't been migrated to Supabase yet.
 * 
 * New code should use ./supabase.js directly.
 */

const { supabaseAdmin, testConnection } = require("./supabase");

// Export pool-like interface for gradual migration
const logger = require("./logger");
const pool = {
  query: async (text, params) => {
    logger.warn("DEPRECATED: Direct pool.query() usage. Migrate to Supabase client.");
    throw new Error("Direct SQL queries not supported with Supabase REST API. Use repository methods or RPC functions.");
  }
};

module.exports = {
  pool,
  query: pool.query,
  getClient: async () => {
    throw new Error("getClient() not supported with Supabase REST API. Use repository methods or RPC functions.");
  },
  testConnection,
  closePool: async () => { 
    logger.info("Supabase connections are managed automatically"); 
  },
  getPoolStats: () => ({ 
    message: "Supabase manages connections automatically" 
  }),
};

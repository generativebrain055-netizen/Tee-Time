const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

/**
 * PostgreSQL Connection Pool Configuration
 *
 * Best Practices:
 * - Connection pooling reduces overhead of creating new connections
 * - Pool size should be tuned based on concurrent requests
 * - Idle timeout prevents hanging connections
 * - Connection timeout prevents indefinite waits
 */
const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "tts_golf_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || undefined,

  // Connection Pool Settings
  max: parseInt(process.env.DB_POOL_MAX || "20", 10), // Maximum number of clients in pool
  min: parseInt(process.env.DB_POOL_MIN || "2", 10), // Minimum number of clients
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10), // 30 seconds
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT || "10000",
    10
  ), // 10 seconds

  // SSL Configuration (enable for production)
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
          ca: process.env.DB_SSL_CA || undefined,
          cert: process.env.DB_SSL_CERT || undefined,
          key: process.env.DB_SSL_KEY || undefined,
        }
      : false,
};

// Create connection pool
const pool = new Pool(poolConfig);

// Error handling
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

pool.on("connect", (client) => {
  console.log("New PostgreSQL client connected to pool");
});

pool.on("acquire", (client) => {
  console.log("Client acquired from pool");
});

pool.on("remove", (client) => {
  console.log("Client removed from pool");
});

/**
 * Execute a query with automatic connection handling
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Database query error:", { text, error: error.message });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<PoolClient>}
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Timeout to prevent hanging transactions
  const timeout = setTimeout(() => {
    console.error("A client has been checked out for more than 5 seconds!");
    console.error(
      "The last query executed on this client was:",
      client.lastQuery
    );
  }, 5000);

  // Monkey patch the query method to track the last query
  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
};

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    const result = await query(
      "SELECT NOW() as current_time, version() as pg_version"
    );
    console.log("✅ Database connection successful");
    console.log("PostgreSQL version:", result.rows[0].pg_version);
    console.log("Current time:", result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log("Database pool closed successfully");
  } catch (error) {
    console.error("Error closing database pool:", error);
    throw error;
  }
};

/**
 * Get pool statistics
 * @returns {Object} Pool statistics
 */
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
  getPoolStats,
};

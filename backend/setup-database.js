/**
 * Database Setup Script for TeeTime Golf App
 * Creates all required tables in Supabase PostgreSQL
 *
 * Usage: node setup-database.js
 */

const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const setupDatabase = async () => {
  console.log("\n🔧 Setting up TeeTime Golf Database...\n");

  const dbName = process.env.DB_NAME || "postgres";
  const isSupabase =
    process.env.DB_HOST && process.env.DB_HOST.includes("supabase.co");

  console.log("📍 Host:", process.env.DB_HOST);
  console.log("📁 Database:", dbName);
  console.log("👤 User:", process.env.DB_USER);
  console.log(
    "🔒 SSL:",
    process.env.DB_SSL === "true" ? "Enabled" : "Disabled"
  );

  if (isSupabase) {
    console.log("\n🟢 Detected Supabase database\n");
  }

  // Connect with SSL for Supabase
  const appPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: dbName,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection first
    console.log("🔌 Testing database connection...");
    const testResult = await appPool.query(
      "SELECT NOW() as time, version() as version"
    );
    console.log("✅ Connected to database successfully!");
    console.log("   Time:", testResult.rows[0].time);
    console.log("   PostgreSQL:", testResult.rows[0].version.split(",")[0]);
    console.log("");

    console.log("📋 Creating tables...\n");

    // Enable UUID extension
    await appPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log("✅ UUID extension enabled");

    // Create users table (matching the repository schema)
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone_number VARCHAR(20) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        username VARCHAR(50) UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        handicap DECIMAL(4,1),
        social_rate DECIMAL(3,2) DEFAULT 0,
        avatar_url TEXT,
        notification_preferences JSONB DEFAULT '{}',
        timezone VARCHAR(50) DEFAULT 'UTC',
        language VARCHAR(10) DEFAULT 'en',
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,
        locked_until TIMESTAMP WITH TIME ZONE,
        failed_login_attempts INTEGER DEFAULT 0,
        last_login_at TIMESTAMP WITH TIME ZONE,
        last_login_ip INET,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Users table created");

    // Create otp_codes table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(6) NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ OTP codes table created");

    // Create otp_requests table (for rate limiting and OTP tracking)
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS otp_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone_number VARCHAR(20) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        otp_code_hash VARCHAR(255) NOT NULL,
        purpose VARCHAR(50) DEFAULT 'login',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        is_verified BOOLEAN DEFAULT false,
        verified_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        ip_address INET,
        device_fingerprint VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ OTP requests table created");

    // Create analytics_events table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        event_category VARCHAR(50),
        event_name VARCHAR(100),
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        device_id VARCHAR(255),
        session_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Analytics events table created");

    // Create magic_links table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS magic_links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Magic links table created");

    // Create refresh_tokens table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        device_info JSONB,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Refresh tokens table created");

    // Create devices table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        device_type VARCHAR(50),
        os VARCHAR(100),
        os_version VARCHAR(50),
        browser VARCHAR(100),
        browser_version VARCHAR(50),
        user_agent TEXT,
        last_ip_address INET,
        is_trusted BOOLEAN DEFAULT false,
        last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, device_fingerprint)
      );
    `);
    console.log("✅ Devices table created");

    // Create sessions table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
        access_token_hash VARCHAR(255),
        refresh_token_hash VARCHAR(255),
        token_family_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        remember_me BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        revoked_at TIMESTAMP WITH TIME ZONE,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Sessions table created");

    // Create golf_courses table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS golf_courses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(255),
        website TEXT,
        holes INTEGER DEFAULT 18,
        par INTEGER,
        slope_rating DECIMAL(5,1),
        course_rating DECIMAL(4,1),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        logo_url TEXT,
        cover_image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Golf courses table created");

    // Create tee_times table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS tee_times (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id UUID REFERENCES golf_courses(id) ON DELETE CASCADE,
        tee_time TIMESTAMP WITH TIME ZONE NOT NULL,
        players_count INTEGER NOT NULL DEFAULT 1,
        max_players INTEGER DEFAULT 4,
        price_per_player DECIMAL(10, 2),
        total_price DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'available',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tee times table created");

    // Create bookings table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tee_time_id UUID NOT NULL REFERENCES tee_times(id) ON DELETE CASCADE,
        players_count INTEGER NOT NULL DEFAULT 1,
        total_price DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'confirmed',
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_id VARCHAR(255),
        special_requests TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Bookings table created");

    // Create scores table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID REFERENCES golf_courses(id) ON DELETE SET NULL,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        total_score INTEGER,
        score_by_hole JSONB,
        putts INTEGER,
        fairways_hit INTEGER,
        greens_in_regulation INTEGER,
        played_at DATE NOT NULL,
        tees_played VARCHAR(50),
        weather_conditions VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Scores table created");

    // Create friendships table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      );
    `);
    console.log("✅ Friendships table created");

    // Create indexes
    console.log("\n📊 Creating indexes...");
    await appPool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
      CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
      CREATE INDEX IF NOT EXISTS idx_otp_requests_phone ON otp_requests(phone_number);
      CREATE INDEX IF NOT EXISTS idx_otp_requests_created ON otp_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
      CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
      CREATE INDEX IF NOT EXISTS idx_sessions_access_token ON sessions(access_token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token_hash);
      CREATE INDEX IF NOT EXISTS idx_tee_times_course ON tee_times(course_id);
      CREATE INDEX IF NOT EXISTS idx_tee_times_datetime ON tee_times(tee_time);
      CREATE INDEX IF NOT EXISTS idx_tee_times_status ON tee_times(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_tee_time ON bookings(tee_time_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_scores_course ON scores(course_id);
      CREATE INDEX IF NOT EXISTS idx_scores_date ON scores(played_at);
      CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
    `);
    console.log("✅ All indexes created");

    // Create updated_at trigger function
    console.log("\n⚙️ Creating triggers...");
    await appPool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = CURRENT_TIMESTAMP;
         RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log("✅ Trigger function created");

    // List all tables
    const tablesResult = await appPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("\n📋 Database tables:");
    tablesResult.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });

    console.log("\n🎉 Database setup completed successfully!\n");

    if (isSupabase) {
      // Extract project ref from host
      const projectRef =
        process.env.DB_HOST.split(".")[1] || "fjfznrnxwcuizxxiveya";
      console.log("✅ Supabase database is ready!");
      console.log(
        `📊 View your data: https://supabase.com/dashboard/project/${projectRef}/editor\n`
      );
    }

    console.log("You can now start the backend server:\n");
    console.log("  cd backend");
    console.log("  npm start\n");

    await appPool.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database setup failed:", error.message);

    if (error.code === "ENOTFOUND") {
      console.error("\n💡 Cannot reach database host. Check DB_HOST in .env");
    } else if (error.message.includes("password")) {
      console.error(
        "\n💡 Password authentication failed. Check DB_PASSWORD in .env"
      );
    } else if (error.message.includes("SSL") || error.message.includes("ssl")) {
      console.error("\n💡 SSL error. For Supabase, set DB_SSL=true in .env");
    } else if (error.code === "ETIMEDOUT") {
      console.error(
        "\n💡 Connection timed out. Check your network or firewall."
      );
    }

    if (isSupabase) {
      const projectRef =
        process.env.DB_HOST?.split(".")[1] || "fjfznrnxwcuizxxiveya";
      console.error("\n🔍 Supabase Troubleshooting:");
      console.error("1. Check your DB_PASSWORD in .env file");
      console.error(
        `2. Get password from: https://supabase.com/dashboard/project/${projectRef}/settings/database`
      );
      console.error('3. Look for "Database password" and use that');
      console.error("4. Make sure DB_SSL=true is set");
    }

    await appPool.end();
    process.exit(1);
  }
};

setupDatabase();

/**
 * Database Setup Script
 * Run this to create the database and tables
 * 
 * Usage: node setup-database.js
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const setupDatabase = async () => {
  console.log('\n🔧 Setting up TeeTime Golf Database...\n');

  const dbName = process.env.DB_NAME || 'postgres';
  const isSupabase = process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co');

  if (isSupabase) {
    console.log('🟢 Detected Supabase database\n');
  }

  // Connect directly to the database (Supabase doesn't allow creating databases)
  const appPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Test connection first
    console.log('🔌 Testing database connection...');
    await appPool.query('SELECT NOW()');
    console.log('✅ Connected to database successfully\n');

    console.log('📋 Creating tables...\n');

    // Create users table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone_number TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        handicap INTEGER,
        social_rate INTEGER DEFAULT 100,
        password_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created');

    // Create otp_requests table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS otp_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        otp_code_hash TEXT NOT NULL,
        purpose TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        is_verified BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        verified_at TIMESTAMPTZ,
        ip_address TEXT,
        device_fingerprint TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ OTP requests table created');

    // Create sessions table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        refresh_token TEXT UNIQUE,
        device_info TEXT,
        ip_address TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Sessions table created');

    // Create indexes
    await appPool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_requests(phone_number);
      CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_requests(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);
    console.log('✅ Indexes created');

    console.log('\n🎉 Database setup completed successfully!\n');
    
    if (isSupabase) {
      console.log('✅ Supabase database is ready!');
      console.log('📊 View your data: https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/editor\n');
    }
    
    console.log('You can now start the backend server:\n');
    console.log('  cd backend');
    console.log('  npm start\n');

    await appPool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    
    if (isSupabase) {
      console.error('\n🔍 Supabase Troubleshooting:');
      console.error('1. Check your DB_PASSWORD in .env file');
      console.error('2. Get password from: https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/settings/database');
      console.error('3. Look for "Connection string" and copy the password');
      console.error('4. Make sure there are no extra spaces in the password');
      console.error('\n💡 See SUPABASE_SETUP.md for detailed instructions\n');
    } else {
      console.error('\nTroubleshooting:');
      console.error('1. Make sure PostgreSQL is installed and running');
      console.error('2. Check your .env file has correct DB_PASSWORD');
      console.error('3. Try connecting manually: psql -U postgres');
      console.error('\nIf PostgreSQL is not installed:');
      console.error('- Windows: Download from https://www.postgresql.org/download/windows/');
      console.error('- Mac: brew install postgresql');
      console.error('- Linux: sudo apt-get install postgresql\n');
    }
    process.exit(1);
  }
};

setupDatabase();

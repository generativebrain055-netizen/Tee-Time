const { pool } = require('./config/database');

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...\n');
    
    await client.query('BEGIN');
    
    // 1. Add missing columns to users table
    console.log('1️⃣ Updating users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS handicap INTEGER,
      ADD COLUMN IF NOT EXISTS social_rate INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
      ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_login_ip INET,
      ADD COLUMN IF NOT EXISTS last_login_device_id INTEGER,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
    `);
    console.log('   ✓ Users table updated\n');
    
    // 2. Create devices table
    console.log('2️⃣ Creating devices table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        device_type VARCHAR(50),
        os VARCHAR(50),
        os_version VARCHAR(50),
        browser VARCHAR(50),
        browser_version VARCHAR(50),
        user_agent TEXT,
        last_ip_address INET,
        last_seen_at TIMESTAMPTZ DEFAULT NOW(),
        is_trusted BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, device_fingerprint)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
    `);
    console.log('   ✓ Devices table created\n');
    
    // 3. Create sessions table
    console.log('3️⃣ Creating sessions table...');
    await client.query(`DROP TABLE IF EXISTS sessions CASCADE`);
    await client.query(`
      CREATE TABLE sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        access_token_hash VARCHAR(255) NOT NULL,
        refresh_token_hash VARCHAR(255) NOT NULL,
        token_family_id VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        remember_me BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        last_activity_at TIMESTAMPTZ DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        revoked_by INTEGER REFERENCES users(id),
        revoke_reason VARCHAR(255)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_access_token_hash ON sessions(access_token_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash)`);
    console.log('   ✓ Sessions table created\n');
    
    // 4. Create magic_links table
    console.log('4️⃣ Creating magic_links table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        purpose VARCHAR(50) NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        is_used BOOLEAN DEFAULT false,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        ip_address INET,
        user_agent TEXT,
        device_fingerprint VARCHAR(255)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);
      CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
      CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);
    `);
    console.log('   ✓ Magic links table created\n');
    
    // 5. Create analytics_events table
    console.log('5️⃣ Creating analytics_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        event_category VARCHAR(50) NOT NULL,
        event_name VARCHAR(100) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
        session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
    `);
    console.log('   ✓ Analytics events table created\n');
    
    // 6. Create login_logs table
    console.log('6️⃣ Creating login_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone_number VARCHAR(20),
        email VARCHAR(255),
        login_method VARCHAR(50) NOT NULL,
        success BOOLEAN NOT NULL,
        failure_reason VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        device_fingerprint VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_login_logs_success ON login_logs(success);
    `);
    console.log('   ✓ Login logs table created\n');
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
    
    // Show all tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📊 All tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => {
    console.log('\n🎉 Database is ready for testing!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });

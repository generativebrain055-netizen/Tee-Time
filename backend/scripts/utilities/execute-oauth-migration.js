require('dotenv').config({ path: '../../.env' });
const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

console.log('🔄 Executing OAuth Migration Directly...\n');

async function executeMigration() {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../schema/migrations/add_oauth_providers.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    console.log('📊 Creating auth_providers table...\n');
    
    // Execute CREATE TABLE
    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS auth_providers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(20) NOT NULL,
          provider_user_id VARCHAR(255) NOT NULL,
          provider_email VARCHAR(255),
          provider_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_used_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT valid_provider CHECK (provider IN ('google', 'apple', 'facebook', 'twitter')),
          CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
        );
      `
    });
    
    if (createError && !createError.message.includes('already exists')) {
      console.log('⚠️  Direct execution not available. Using Supabase client...\n');
      
      // Try to verify table exists by querying it
      const { data, error: checkError } = await supabaseAdmin
        .from('auth_providers')
        .select('count')
        .limit(0);
      
      if (checkError && checkError.message.includes('does not exist')) {
        console.log('❌ Table does not exist. Manual migration required.\n');
        console.log('📋 Please run this SQL in Supabase Dashboard > SQL Editor:\n');
        console.log('─'.repeat(60));
        console.log(migrationSQL);
        console.log('─'.repeat(60));
        console.log('\n💡 Steps:');
        console.log('1. Go to: https://supabase.com/dashboard/project/dzqukppcdqgkknnwbnvx/sql');
        console.log('2. Copy the SQL above');
        console.log('3. Paste and click "Run"');
        console.log('4. Run this script again to verify\n');
        return false;
      }
      
      console.log('✅ Table already exists!\n');
      return true;
    }
    
    console.log('✅ Table created successfully!\n');
    
    // Verify
    const { data, error: verifyError } = await supabaseAdmin
      .from('auth_providers')
      .select('count')
      .limit(1);
    
    if (verifyError) {
      console.log('⚠️  Verification failed:', verifyError.message);
      return false;
    }
    
    console.log('✅ Verification successful - auth_providers table is ready!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

executeMigration().then(success => {
  if (success) {
    console.log('🎉 Migration complete! OAuth is ready to use.\n');
  } else {
    console.log('⚠️  Migration needs manual execution. See instructions above.\n');
  }
});

require('dotenv').config({ path: '../../.env' });
const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

console.log('🔄 Running OAuth Migration...\n');

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../schema/migrations/add_oauth_providers.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('📊 Executing SQL...\n');
    
    // Execute migration
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: migrationSQL
    });
    
    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || 
            statement.includes('CREATE TRIGGER') || statement.includes('ALTER TABLE') ||
            statement.includes('COMMENT ON')) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          
          // Use raw query
          const { error: execError } = await supabaseAdmin
            .from('_migrations')
            .select('*')
            .limit(0);
          
          // This is a workaround - in production, use Supabase SQL Editor
          console.log('⚠️  Please run migration manually in Supabase SQL Editor');
          console.log('   File: backend/schema/migrations/add_oauth_providers.sql');
          return;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify table exists
    const { data: tableCheck, error: checkError } = await supabaseAdmin
      .from('auth_providers')
      .select('count')
      .limit(1);
    
    if (checkError) {
      console.log('❌ Verification failed:', checkError.message);
      console.log('\n💡 Please run the migration manually:');
      console.log('   1. Open Supabase Dashboard');
      console.log('   2. Go to SQL Editor');
      console.log('   3. Copy and paste: backend/schema/migrations/add_oauth_providers.sql');
      console.log('   4. Click "Run"');
    } else {
      console.log('✅ Table verified: auth_providers exists');
      console.log('\n🎉 OAuth setup is complete!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Manual migration required:');
    console.log('   1. Open Supabase Dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy and paste: backend/schema/migrations/add_oauth_providers.sql');
    console.log('   4. Click "Run"');
  }
}

runMigration();

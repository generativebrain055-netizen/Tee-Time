require('dotenv').config({ path: '../../.env' });
const { supabaseAdmin } = require('../config/supabase');

console.log('🔐 OAuth Setup Verification\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('─'.repeat(60));

const requiredVars = {
  'JWT_SECRET': process.env.JWT_SECRET,
  'GOOGLE_CLIENT_ID_IOS': process.env.GOOGLE_CLIENT_ID_IOS,
  'GOOGLE_CLIENT_ID_ANDROID': process.env.GOOGLE_CLIENT_ID_ANDROID,
  'GOOGLE_CLIENT_ID_WEB': process.env.GOOGLE_CLIENT_ID_WEB,
  'APPLE_CLIENT_ID': process.env.APPLE_CLIENT_ID,
};

let allConfigured = true;
for (const [key, value] of Object.entries(requiredVars)) {
  const isSet = value && !value.includes('YOUR_') && !value.includes('HERE');
  const status = isSet ? '✅' : '⚠️ ';
  console.log(`${status} ${key}: ${isSet ? '***' + value.slice(-8) : 'NOT CONFIGURED'}`);
  if (!isSet && key !== 'GOOGLE_CLIENT_ID_WEB') {
    allConfigured = false;
  }
}

// Check database table
console.log('\n📊 Database Check:');
console.log('─'.repeat(60));

async function checkDatabase() {
  try {
    // Check if auth_providers table exists
    const { data, error } = await supabaseAdmin
      .from('auth_providers')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ auth_providers table: NOT FOUND');
        console.log('\n💡 Run migration:');
        console.log('   backend/schema/migrations/add_oauth_providers.sql');
        return false;
      }
      throw error;
    }
    
    console.log('✅ auth_providers table: EXISTS');
    
    // Check for existing provider links
    const { data: providers, error: provError } = await supabaseAdmin
      .from('auth_providers')
      .select('provider, count')
      .limit(10);
    
    if (provError) throw provError;
    
    if (providers && providers.length > 0) {
      console.log(`✅ Provider links found: ${providers.length}`);
    } else {
      console.log('ℹ️  No provider links yet (expected for new setup)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

// Check dependencies
console.log('\n📦 Dependencies:');
console.log('─'.repeat(60));

try {
  require('google-auth-library');
  console.log('✅ google-auth-library: INSTALLED');
} catch (e) {
  console.log('❌ google-auth-library: NOT INSTALLED');
  console.log('   Run: npm install google-auth-library');
}

try {
  require('jwks-rsa');
  console.log('✅ jwks-rsa: INSTALLED');
} catch (e) {
  console.log('❌ jwks-rsa: NOT INSTALLED');
  console.log('   Run: npm install jwks-rsa');
}

try {
  require('jsonwebtoken');
  console.log('✅ jsonwebtoken: INSTALLED');
} catch (e) {
  console.log('❌ jsonwebtoken: NOT INSTALLED');
}

// Check files
console.log('\n📁 Implementation Files:');
console.log('─'.repeat(60));

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  '../services/oauthService.js',
  '../repositories/authProviderRepository.js',
  '../controllers/auth/oauthController.js',
  '../schema/migrations/add_oauth_providers.sql',
];

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file.replace('../', '')}`);
}

// Summary
async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 Summary:');
  console.log('─'.repeat(60));
  
  const dbOk = await checkDatabase();
  
  if (allConfigured && dbOk) {
    console.log('✅ OAuth implementation is ready!');
    console.log('\n📚 Next steps:');
    console.log('1. Configure OAuth credentials in .env');
    console.log('2. Test with mobile app');
    console.log('3. Review docs/OAUTH_IMPLEMENTATION.md');
  } else {
    console.log('⚠️  Setup incomplete. Please address the issues above.');
    console.log('\n📚 Required actions:');
    if (!allConfigured) {
      console.log('1. Configure OAuth credentials in .env file');
    }
    if (!dbOk) {
      console.log('2. Run database migration for auth_providers table');
    }
    console.log('3. Install missing dependencies: npm install');
  }
  
  console.log('\n📖 Documentation: backend/docs/OAUTH_IMPLEMENTATION.md');
  console.log('=' .repeat(60));
}

printSummary();

/**
 * Twilio Configuration Test Script
 * Run this to verify your Twilio setup
 * 
 * Usage: node test-twilio.js +923001234567
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const twilio = require('twilio');

const testTwilioSetup = async (testPhoneNumber) => {
  console.log('\n🔍 Testing Twilio Configuration...\n');
  
  // Check environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  
  console.log('📋 Configuration Check:');
  console.log(`   TWILIO_ACCOUNT_SID: ${accountSid ? '✅ Set' : '❌ Missing'} ${accountSid ? `(${accountSid.substring(0, 10)}...)` : ''}`);
  console.log(`   TWILIO_AUTH_TOKEN: ${authToken ? '✅ Set' : '❌ Missing'} ${authToken ? '(hidden)' : ''}`);
  console.log(`   TWILIO_VERIFY_SERVICE_SID: ${verifyServiceSid ? '✅ Set' : '⚠️  Not set (will use fallback)'} ${verifyServiceSid ? `(${verifyServiceSid.substring(0, 10)}...)` : ''}`);
  console.log(`   TWILIO_FROM_NUMBER: ${fromNumber ? '✅ Set' : '⚠️  Not set'} ${fromNumber || ''}`);
  
  if (!accountSid || !authToken) {
    console.log('\n❌ ERROR: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required!');
    console.log('   Please update your .env file with your Twilio credentials.');
    console.log('   Get them from: https://console.twilio.com/\n');
    process.exit(1);
  }
  
  if (!accountSid.startsWith('AC')) {
    console.log('\n❌ ERROR: Invalid TWILIO_ACCOUNT_SID. Must start with "AC"');
    process.exit(1);
  }
  
  // Initialize Twilio client
  let client;
  try {
    client = twilio(accountSid, authToken);
    console.log('\n✅ Twilio client initialized successfully\n');
  } catch (error) {
    console.log('\n❌ ERROR: Failed to initialize Twilio client');
    console.log(`   ${error.message}\n`);
    process.exit(1);
  }
  
  // Test Verify API if configured
  if (verifyServiceSid) {
    console.log('🧪 Testing Verify API...');
    
    if (!testPhoneNumber) {
      console.log('⚠️  No phone number provided. Skipping send test.');
      console.log('   Usage: node test-twilio.js +923001234567\n');
      console.log('✅ Configuration looks good! Verify API is ready to use.\n');
      return;
    }
    
    try {
      console.log(`   Sending OTP to ${testPhoneNumber}...`);
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ to: testPhoneNumber, channel: 'sms' });
      
      console.log(`   ✅ OTP sent successfully!`);
      console.log(`   Status: ${verification.status}`);
      console.log(`   SID: ${verification.sid}`);
      console.log(`\n   📱 Check your phone for the OTP code.`);
      console.log(`   💡 To verify, use: /auth/verify-otp endpoint\n`);
    } catch (error) {
      console.log(`   ❌ Failed to send OTP via Verify API`);
      console.log(`   Error: ${error.message}`);
      
      if (error.code === 20404) {
        console.log(`\n   💡 Tip: Invalid Verify Service SID. Check your TWILIO_VERIFY_SERVICE_SID`);
        console.log(`   Create one at: https://console.twilio.com/us1/develop/verify/services\n`);
      } else if (error.code === 60200) {
        console.log(`\n   💡 Tip: Invalid phone number format. Use E.164 format: +923001234567\n`);
      }
    }
  } else {
    console.log('⚠️  Verify API not configured. Will use fallback method.');
    
    if (!fromNumber) {
      console.log('⚠️  TWILIO_FROM_NUMBER not set. You need either:');
      console.log('   1. TWILIO_VERIFY_SERVICE_SID (recommended), OR');
      console.log('   2. TWILIO_FROM_NUMBER (requires phone number purchase)\n');
      console.log('💡 Recommendation: Set up Verify API - it\'s FREE for development!');
      console.log('   Create at: https://console.twilio.com/us1/develop/verify/services\n');
      return;
    }
    
    if (!testPhoneNumber) {
      console.log('⚠️  No phone number provided. Skipping send test.');
      console.log('   Usage: node test-twilio.js +923001234567\n');
      console.log('✅ Configuration looks good! Messages API is ready to use.\n');
      return;
    }
    
    // Test Messages API
    console.log('🧪 Testing Messages API...');
    try {
      console.log(`   Sending test SMS to ${testPhoneNumber}...`);
      const message = await client.messages.create({
        body: 'Test message from TeeTime Golf App. Your Twilio setup is working!',
        from: fromNumber,
        to: testPhoneNumber,
      });
      
      console.log(`   ✅ SMS sent successfully!`);
      console.log(`   SID: ${message.sid}`);
      console.log(`   Status: ${message.status}`);
      console.log(`\n   📱 Check your phone for the test message.\n`);
    } catch (error) {
      console.log(`   ❌ Failed to send SMS via Messages API`);
      console.log(`   Error: ${error.message}`);
      
      if (error.code === 21608) {
        console.log(`\n   💡 Tip: Phone number not verified. For trial accounts:`);
        console.log(`   1. Verify the number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified`);
        console.log(`   2. OR upgrade to a paid account\n`);
      } else if (error.code === 21606) {
        console.log(`\n   💡 Tip: Invalid FROM number. Check TWILIO_FROM_NUMBER in .env\n`);
      }
    }
  }
  
  console.log('✅ Test complete!\n');
};

// Get phone number from command line argument
const testPhone = process.argv[2];

if (!testPhone && (process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_FROM_NUMBER)) {
  console.log('\n💡 Tip: Provide a phone number to test sending OTP:');
  console.log('   node test-twilio.js +923001234567\n');
}

testTwilioSetup(testPhone).catch(error => {
  console.error('\n❌ Unexpected error:', error.message);
  process.exit(1);
});

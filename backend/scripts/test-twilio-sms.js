require('dotenv').config({ path: '../../.env' });
const twilio = require('twilio');
const logger = require('../config/logger');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

console.log('Testing Twilio Configuration...');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken ? '***' + authToken.slice(-4) : 'NOT SET');
console.log('Verify Service SID:', verifyServiceSid || 'NOT SET');

if (!accountSid || !authToken) {
  console.error('Twilio credentials not configured!');
  process.exit(1);
}

const client = twilio(accountSid, authToken);
const testPhoneNumber = '+923054449099';

async function testTwilio() {
  try {
    // Test 1: Check if Verify Service is configured
    if (verifyServiceSid) {
      console.log('\n--- Testing Twilio Verify Service ---');
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({
          to: testPhoneNumber,
          channel: 'sms'
        });
      
      console.log('SUCCESS! Verification sent via Verify Service');
      console.log('Status:', verification.status);
      console.log('SID:', verification.sid);
      console.log('Check your phone for the OTP!');
      return;
    }

    // Test 2: Try to get available phone numbers
    console.log('\n--- Checking Twilio Phone Numbers ---');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 10 });
    
    if (phoneNumbers.length === 0) {
      console.log('No phone numbers found in your Twilio account.');
      console.log('\nYou need to either:');
      console.log('1. Buy a phone number from Twilio console');
      console.log('2. Create a Verify Service (recommended for OTP)');
      console.log('\nFor now, generating OTP in console mode...');
      const otp = Math.floor(100000 + Math.random() * 900000);
      console.log(`\nOTP for ${testPhoneNumber}: ${otp}`);
      return;
    }

    console.log(`Found ${phoneNumbers.length} phone number(s):`);
    phoneNumbers.forEach(num => {
      console.log(`  - ${num.phoneNumber} (${num.friendlyName})`);
    });

    // Test 3: Try sending SMS with first available number
    const fromNumber = phoneNumbers[0].phoneNumber;
    console.log(`\n--- Sending Test SMS from ${fromNumber} ---`);
    
    const otp = Math.floor(100000 + Math.random() * 900000);
    const message = await client.messages.create({
      body: `Your TeeTime Golf verification code is: ${otp}. Valid for 5 minutes.`,
      from: fromNumber,
      to: testPhoneNumber
    });

    console.log('SUCCESS! SMS sent');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('OTP:', otp);
    console.log('Check your phone!');

  } catch (error) {
    console.error('\nERROR:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.moreInfo) {
      console.error('More Info:', error.moreInfo);
    }
    
    // Fallback: Generate OTP in console
    console.log('\nFalling back to console mode...');
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(`OTP for ${testPhoneNumber}: ${otp}`);
  }
}

testTwilio();

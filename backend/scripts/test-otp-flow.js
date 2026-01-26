require('dotenv').config({ path: '../../.env' });
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';
const TEST_PHONE = '+923054449099';

console.log('🧪 Testing Complete OTP Flow in Development Mode\n');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('API URL:', API_URL);
console.log('Test Phone:', TEST_PHONE);
console.log('Verify Service SID:', process.env.TWILIO_VERIFY_SERVICE_SID || 'NOT SET (Console Mode)');
console.log('\n' + '='.repeat(60) + '\n');

async function testOTPFlow() {
  try {
    // Step 1: Request OTP for signup
    console.log('📤 Step 1: Requesting OTP for signup...');
    const requestResponse = await fetch(`${API_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: TEST_PHONE,
        purpose: 'signup'
      })
    });

    const requestData = await requestResponse.json();
    console.log('Response:', JSON.stringify(requestData, null, 2));

    if (!requestData.success) {
      console.error('❌ Failed to request OTP');
      return;
    }

    console.log('\n✅ OTP Request Successful!');
    console.log('Mode:', requestData.mode);
    console.log('Message:', requestData.message);
    
    if (requestData.mode === 'console' || requestData.mode === 'console_fallback') {
      console.log('\n💡 Development Mode Active:');
      console.log('   - OTP is printed in the server console');
      console.log('   - Check the backend logs above for the 6-digit code');
      console.log('   - No SMS will be sent (saves costs during development)');
    } else if (requestData.mode === 'verify_api') {
      console.log('\n📱 Production Mode Active:');
      console.log('   - OTP sent via Twilio Verify API');
      console.log('   - Check your phone for the SMS');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Look at the server console logs above');
    console.log('2. Find the line: "[DEVELOPMENT MODE] OTP for +923054449099: XXXXXX"');
    console.log('3. Use that OTP code in your mobile app to complete signup/login');
    console.log('\n' + '='.repeat(60));

    // Step 2: Test with a sample OTP (this will fail, but shows the flow)
    console.log('\n📤 Step 2: Testing OTP verification with sample code (123456)...');
    const verifyResponse = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: TEST_PHONE,
        otp: '123456',
        purpose: 'signup',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'Test123!'
      })
    });

    const verifyData = await verifyResponse.json();
    console.log('Response:', JSON.stringify(verifyData, null, 2));

    if (verifyData.success) {
      console.log('\n✅ OTP Verified! (Unexpected - was using sample code)');
    } else {
      console.log('\n⚠️  OTP Verification Failed (Expected - used wrong code)');
      console.log('This is normal! Use the actual OTP from server logs.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure the backend server is running:');
    console.log('   cd backend && npm start');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    if (data.status === 'ok') {
      console.log('✅ Backend server is running\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Backend server is not running!');
    console.log('\n💡 Start the server first:');
    console.log('   cd backend && npm start\n');
    return false;
  }
}

(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testOTPFlow();
  }
})();

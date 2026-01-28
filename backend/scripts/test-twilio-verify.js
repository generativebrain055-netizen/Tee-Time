require('dotenv').config({ path: '../../.env' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const testPhoneNumber = '+923054449099';

console.log('Testing Twilio Verify Service Setup...\n');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken ? '***' + authToken.slice(-4) : 'NOT SET');

if (!accountSid || !authToken) {
  console.error('❌ Twilio credentials not configured!');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function setupVerifyService() {
  try {
    console.log('\n--- Step 1: Checking for existing Verify Services ---');
    
    // List existing verify services
    const services = await client.verify.v2.services.list({ limit: 20 });
    
    if (services.length > 0) {
      console.log(`✅ Found ${services.length} Verify Service(s):`);
      services.forEach(service => {
        console.log(`  - ${service.friendlyName} (SID: ${service.sid})`);
      });
      
      // Use the first one
      const verifyServiceSid = services[0].sid;
      console.log(`\n✅ Using Verify Service: ${services[0].friendlyName}`);
      console.log(`   SID: ${verifyServiceSid}`);
      console.log('\n📝 Add this to your .env file:');
      console.log(`TWILIO_VERIFY_SERVICE_SID=${verifyServiceSid}`);
      
      // Test sending OTP
      console.log(`\n--- Step 2: Sending OTP to ${testPhoneNumber} ---`);
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({
          to: testPhoneNumber,
          channel: 'sms'
        });
      
      console.log('✅ SUCCESS! OTP sent via Verify Service');
      console.log('Status:', verification.status);
      console.log('Valid:', verification.valid);
      console.log('To:', verification.to);
      console.log('\n📱 Check your phone for the OTP!');
      
      return;
    }
    
    // No services found, create one
    console.log('⚠️  No Verify Services found. Creating one...\n');
    
    const newService = await client.verify.v2.services.create({
      friendlyName: 'TeeTime Golf OTP Service'
    });
    
    console.log('✅ Created new Verify Service!');
    console.log('   Name:', newService.friendlyName);
    console.log('   SID:', newService.sid);
    console.log('\n📝 Add this to your .env file:');
    console.log(`TWILIO_VERIFY_SERVICE_SID=${newService.sid}`);
    
    // Test sending OTP
    console.log(`\n--- Step 2: Sending OTP to ${testPhoneNumber} ---`);
    const verification = await client.verify.v2
      .services(newService.sid)
      .verifications
      .create({
        to: testPhoneNumber,
        channel: 'sms'
      });
    
    console.log('✅ SUCCESS! OTP sent via Verify Service');
    console.log('Status:', verification.status);
    console.log('Valid:', verification.valid);
    console.log('To:', verification.to);
    console.log('\n📱 Check your phone for the OTP!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.moreInfo) {
      console.error('More Info:', error.moreInfo);
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('1. Verify your Twilio credentials are correct');
    console.log('2. Check if your Twilio account is active');
    console.log('3. Ensure you have sufficient balance');
    console.log('4. Check if the phone number format is correct (+923054449099)');
    
    process.exit(1);
  }
}

setupVerifyService();

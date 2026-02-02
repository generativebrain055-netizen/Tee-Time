/**
 * OAuth Debug Script
 * Run this to see what redirect URI Expo is generating
 * 
 * Usage: node debug-oauth.js
 */

const { makeRedirectUri } = require('expo-auth-session');

console.log('\n=== OAuth Debug Information ===\n');

// Test different configurations
const configs = [
  { scheme: 'teetimesocial', useProxy: true },
  { scheme: 'teetimesocial', useProxy: false },
  { useProxy: true },
  { useProxy: false },
];

configs.forEach((config, index) => {
  try {
    const uri = makeRedirectUri(config);
    console.log(`Config ${index + 1}:`, JSON.stringify(config));
    console.log(`Result: ${uri}\n`);
  } catch (error) {
    console.log(`Config ${index + 1}:`, JSON.stringify(config));
    console.log(`Error: ${error.message}\n`);
  }
});

console.log('=== What to do next ===\n');
console.log('1. Copy the redirect URI that matches your setup');
console.log('2. Go to: https://console.cloud.google.com/apis/credentials');
console.log('3. Find your iOS Client ID: 759920946936-8avkln9fd3c6h3e1hdao3a9amg3g67qs');
console.log('4. Click Edit');
console.log('5. Under "Authorized redirect URIs", add the URI from above');
console.log('6. Click Save and wait 5 minutes for changes to propagate\n');

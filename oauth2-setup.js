// oauth2-setup.js - Fixed OAuth2 setup for Gmail API
require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

// SECURITY: Never commit these values! Set them in .env file
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Use OOB for desktop apps

// Validate credentials are set
if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
  console.error('❌ ERROR: OAuth credentials not configured!');
  console.error('Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://mail.google.com/'
];

// Generate authentication URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('🔐 Fixed OAuth2 Setup for Gmail API');
console.log('==================================');
console.log('IMPORTANT: Use this redirect URI in Google Console:');
console.log('urn:ietf:wg:oauth:2.0:oob');
console.log('');
console.log('1. Open this URL in your browser:');
console.log(authUrl);
console.log('\n2. Complete the authorization');
console.log('3. Copy the authorization code from the page');
console.log('4. Paste it below when prompted\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Success! Add these to your .env file:');
    console.log('==========================================');
    console.log(`EMAIL_USER=kefifyoucef2020@gmail.com`);
    console.log(`CLIENT_ID=${CLIENT_ID}`);
    console.log(`CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`ACCESS_TOKEN=${tokens.access_token}`);
    console.log('\n🎉 Your OAuth2 email service is ready!');
    
    // Test the tokens
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(`📧 Connected to: ${profile.data.emailAddress}`);
    
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.log('\n🔧 Fix: Update your Google Cloud Console:');
      console.log('1. Go to APIs & Services → Credentials');
      console.log('2. Edit your OAuth 2.0 Client ID');
      console.log('3. Add redirect URI: urn:ietf:wg:oauth:2.0:oob');
      console.log('4. Save and try again');
    }
  }
  rl.close();
});
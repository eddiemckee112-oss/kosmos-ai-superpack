import { google } from 'googleapis';
import fs from 'fs';
export function makeOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT || 'http://localhost:3040/gmail/oauth/callback';
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing');
  return new google.auth.OAuth2(clientId, clientSecret, redirect);
}
export function getAuthUrl(scopes=['https://www.googleapis.com/auth/gmail.readonly']) {
  const oAuth2Client = makeOAuthClient();
  return oAuth2Client.generateAuthUrl({ access_type:'offline', scope: scopes });
}
export async function handleOAuthCallback(code) {
  const oAuth2Client = makeOAuthClient();
  const { tokens } = await oAuth2Client.getToken(code);
  fs.mkdirSync('./store', {recursive:true});
  fs.writeFileSync('./store/gmail_tokens.json', JSON.stringify(tokens,null,2));
  return tokens;
}

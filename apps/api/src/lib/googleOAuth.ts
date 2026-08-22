import { OAuth2Client } from 'google-auth-library';
import { env } from './env';

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string | null;
}

function client(): OAuth2Client {
  return new OAuth2Client(env.google.clientId, env.google.clientSecret, env.google.redirectUri);
}

export function buildGoogleAuthUrl(state: string): string {
  return client().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
  });
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const oauth2Client = client();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Google token exchange did not return an id_token');
  }
  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Google ID token payload missing sub/email');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    fullName: payload.name ?? null,
  };
}

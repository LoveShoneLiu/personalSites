import { createHash } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from 'jose';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';

export type ProviderIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

const googleAudiences = () => (process.env.RECEIPTLY_GOOGLE_AUDIENCES ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export const verifyGoogleIdentity = async (idToken: string): Promise<ProviderIdentity> => {
  const audiences = googleAudiences();
  if (audiences.length === 0) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Google login is not configured.');
  }
  try {
    const ticket = await new OAuth2Client().verifyIdToken({ idToken, audience: audiences });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.iss || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
      throw new Error('Invalid Google issuer or subject.');
    }
    const { azp } = payload as typeof payload & { azp?: string };
    if (azp && !audiences.includes(azp)) throw new Error('Invalid Google authorized party.');
    const emailVerified = payload.email_verified === true;
    return {
      subject: payload.sub,
      email: emailVerified ? payload.email?.trim().toLowerCase() ?? null : null,
      emailVerified,
      displayName: payload.name?.trim() || null,
    };
  } catch {
    throw new ReceiptlyError(401, 'PROVIDER_TOKEN_INVALID', 'Google登录凭据无效。');
  }
};

const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const appleClientId = () => {
  const value = process.env.RECEIPTLY_APPLE_CLIENT_ID;
  if (!value) throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Apple login is not configured.');
  return value;
};

export const verifyAppleIdentity = async (
  identityToken: string,
  rawNonce: string,
): Promise<ProviderIdentity> => {
  try {
    const { payload } = await jwtVerify(identityToken, appleJwks, {
      algorithms: ['RS256'],
      audience: appleClientId(),
      issuer: 'https://appleid.apple.com',
    });
    const expectedNonce = createHash('sha256').update(rawNonce).digest('hex');
    if (payload.nonce !== expectedNonce) {
      throw new ReceiptlyError(401, 'LOGIN_NONCE_INVALID', 'Apple登录 nonce 无效。');
    }
    if (typeof payload.sub !== 'string') throw new Error('Missing Apple subject.');
    return {
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      displayName: null,
    };
  } catch (error) {
    if (error instanceof ReceiptlyError) throw error;
    throw new ReceiptlyError(401, 'PROVIDER_TOKEN_INVALID', 'Apple登录凭据无效。');
  }
};

const appleClientSecret = async () => {
  const teamId = process.env.RECEIPTLY_APPLE_TEAM_ID;
  const keyId = process.env.RECEIPTLY_APPLE_KEY_ID;
  const privateKey = process.env.RECEIPTLY_APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!teamId || !keyId || !privateKey) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Apple token exchange is not configured.');
  }
  const key = await importPKCS8(privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setAudience('https://appleid.apple.com')
    .setSubject(appleClientId())
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
};

export const exchangeAppleAuthorizationCode = async (authorizationCode: string) => {
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appleClientId(),
      client_secret: await appleClientSecret(),
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  const payload = await response.json() as { refresh_token?: string; error?: string };
  if (!response.ok || !payload.refresh_token) {
    throw new ReceiptlyError(401, 'PROVIDER_TOKEN_INVALID', 'Apple授权码无效。');
  }
  return payload.refresh_token;
};

export const revokeAppleToken = async (refreshToken: string) => {
  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appleClientId(),
      client_secret: await appleClientSecret(),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!response.ok) throw new ReceiptlyError(503, 'INTERNAL_ERROR', 'Apple authorization could not be revoked.');
};

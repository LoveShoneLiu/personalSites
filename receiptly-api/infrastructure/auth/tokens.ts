import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';

type AccessTokenPayload = {
  sub: string;
  exp: number;
  typ: 'access';
};

const base64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');
const secret = () => {
  const value = process.env.RECEIPTLY_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Receiptly token signing is not configured.');
  }
  return value;
};

const signature = (value: string) => createHmac('sha256', secret()).update(value).digest('base64url');

export const createAccessToken = (userId: string) => {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ sub: userId, typ: 'access', exp: Math.floor(Date.now() / 1000) + 900 }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${signature(unsigned)}`;
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const parts = token.split('.');
  if (parts.length !== 3) throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Invalid access token.');

  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(unsigned));
  const received = Buffer.from(parts[2]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Invalid access token.');
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as AccessTokenPayload;
    if (payload.typ !== 'access' || !payload.sub || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Access token has expired.');
    }
    return payload;
  } catch (error) {
    if (error instanceof ReceiptlyError) throw error;
    throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Invalid access token.');
  }
};

export const createRefreshToken = () => randomBytes(48).toString('base64url');

export const hashToken = (token: string) => createHmac('sha256', secret()).update(token).digest('hex');

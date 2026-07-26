import { createHmac, randomBytes } from 'crypto';
import {
  errors as joseErrors,
  jwtVerify,
  SignJWT,
} from 'jose';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';

type AccessTokenPayload = {
  sub: string;
  sid: string;
  jti: string;
  iat: number;
  exp: number;
  typ: 'access';
};

const ISSUER = 'receiptly-api';
const AUDIENCE = 'receiptly-mobile';

const secret = () => {
  const value = process.env.RECEIPTLY_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Receiptly token signing is not configured.');
  }
  return value;
};

const signingKey = () => new TextEncoder().encode(secret());

export const createAccessToken = async (userId: string, sessionId: string) => new SignJWT({
  sid: sessionId,
  typ: 'access',
})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuer(ISSUER)
  .setAudience(AUDIENCE)
  .setSubject(userId)
  .setJti(crypto.randomUUID())
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(signingKey());

export const verifyAccessToken = async (token: string): Promise<AccessTokenPayload> => {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: ISSUER,
    });
    if (
      payload.typ !== 'access'
      || typeof payload.sub !== 'string'
      || typeof payload.sid !== 'string'
      || typeof payload.jti !== 'string'
      || typeof payload.iat !== 'number'
      || typeof payload.exp !== 'number'
    ) {
      throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Authentication is invalid.');
    }
    return payload as unknown as AccessTokenPayload;
  } catch (error) {
    if (error instanceof ReceiptlyError) throw error;
    if (error instanceof joseErrors.JWTExpired) {
      throw new ReceiptlyError(401, 'ACCESS_TOKEN_EXPIRED', '登录状态已过期。');
    }
    throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Authentication is invalid.');
  }
};

export const createRefreshToken = () => randomBytes(48).toString('base64url');

export const hashToken = (token: string) => createHmac('sha256', secret()).update(token).digest('hex');

export const hashLoginSecret = (value: string) => createHmac('sha256', secret()).update(value).digest('hex');

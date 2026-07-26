/** 文件职责：签发和验证 Access Token，并生成、Hash 不透明登录凭据。 */
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

/**
 * 签发绑定到服务端会话的短期 Access Token。
 * Token 中的 Session ID 允许登出在 JWT 到期前立即使其失效，无需维护独立黑名单。
 */
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

/**
 * 校验 JWT 签名以及 Receiptly 要求的 Claims 结构。
 * 当前账号和会话状态由 `requireActor` 继续通过数据库校验。
 */
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

/** 创建高熵、不透明的 Refresh Token；数据库只保存其 HMAC。 */
export const createRefreshToken = () => randomBytes(48).toString('base64url');

/** 为 Refresh Token 生成不可逆的数据库查询值。 */
export const hashToken = (token: string) => createHmac('sha256', secret()).update(token).digest('hex');

/** 为 OAuth state、邮箱验证码等短期登录数据生成 Hash。 */
export const hashLoginSecret = (value: string) => createHmac('sha256', secret()).update(value).digest('hex');

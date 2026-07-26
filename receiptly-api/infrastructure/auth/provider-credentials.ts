/** 文件职责：使用 AES-256-GCM 加密和解密第三方 Provider Refresh Token。 */
import {
  createCipheriv, createDecipheriv, randomBytes,
} from 'crypto';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';

const key = () => {
  const encoded = process.env.RECEIPTLY_PROVIDER_ENCRYPTION_KEY;
  if (!encoded) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Provider credential encryption is not configured.');
  }
  const value = Buffer.from(encoded, 'base64');
  if (value.length !== 32) {
    throw new ReceiptlyError(503, 'CONFIGURATION_ERROR', 'Provider credential encryption key must be 32 bytes.');
  }
  return value;
};

/**
 * 使用带认证加密保护第三方 Provider Refresh Token。
 * 随机 IV 和 GCM Tag 与密文一起保存，密钥只存在于环境变量中，不写入数据库。
 */
export const encryptProviderToken = (token: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
};

/** 解密并校验由上述方法生成的 Provider Token 密文。 */
export const decryptProviderToken = (value: string) => {
  const decoded = Buffer.from(value, 'base64');
  const iv = decoded.subarray(0, 12);
  const tag = decoded.subarray(12, 28);
  const ciphertext = decoded.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

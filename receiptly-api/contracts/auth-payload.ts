/** 文件职责：校验认证接口的邮箱、密码、UUID、设备和资料字段。 */
import { AuthDevice } from './auth';
import { ReceiptlyError } from './errors';
import { readObject, requiredString } from './validation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const requiredUuid = (value: unknown, field: string) => {
  const result = requiredString(value, field, 36);
  if (!UUID_PATTERN.test(result)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must be a UUID.`);
  }
  return result;
};

export const requiredEmail = (value: unknown, field = 'email') => {
  const result = requiredString(value, field, 320).trim().toLowerCase();
  if (!EMAIL_PATTERN.test(result)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', `${field} must be a valid email address.`);
  }
  return result;
};

/**
 * 执行 bcrypt 的 72 字节输入上限，而不仅是字符数限制。
 * 多字节 Unicode 密码的每个字符可能占用多个字节。
 */
export const requiredPassword = (value: unknown, field = 'password') => {
  if (
    typeof value !== 'string'
    || value.length < 8
    || !value.trim()
    || new TextEncoder().encode(value).length > 72
  ) {
    throw new ReceiptlyError(
      400,
      'VALIDATION_ERROR',
      `${field} must contain 8 to 72 bytes and cannot be blank.`,
    );
  }
  return value;
};

/**
 * 校验用于绑定及轮换 Refresh Token 会话的稳定 App 安装 ID。
 * 用户可编辑的设备名称只作为元数据。
 */
export const readAuthDevice = (value: unknown): AuthDevice => {
  const device = readObject(value);
  const platform = requiredString(device.platform, 'device.platform', 16);
  if (platform !== 'ios' && platform !== 'android' && platform !== 'web') {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'device.platform is invalid.');
  }
  const name = device.name === undefined || device.name === null || device.name === ''
    ? null
    : requiredString(device.name, 'device.name', 160);
  return {
    installationId: requiredUuid(device.installationId, 'device.installationId'),
    platform,
    name,
  };
};

export const nullableProfileString = (value: unknown, field: string, maxLength: number) => {
  if (value === undefined || value === null || value === '') return null;
  return requiredString(value, field, maxLength);
};

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

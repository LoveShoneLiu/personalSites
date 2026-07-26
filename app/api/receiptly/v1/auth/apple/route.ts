import { NextRequest } from 'next/server';
import { loginWithApple } from '@/receiptly-api/application/auth';
import {
  nullableProfileString,
  readAuthDevice,
  requiredUuid,
} from '@/receiptly-api/contracts/auth-payload';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    const profile = readObject(body.profile);
    return dataResponse(await loginWithApple({
      attemptId: requiredUuid(body.attemptId, 'attemptId'),
      state: requiredString(body.state, 'state', 512),
      identityToken: requiredString(body.identityToken, 'identityToken', 8192),
      authorizationCode: requiredString(body.authorizationCode, 'authorizationCode', 4096),
      profile: {
        email: nullableProfileString(profile.email, 'profile.email', 320),
        givenName: nullableProfileString(profile.givenName, 'profile.givenName', 80),
        familyName: nullableProfileString(profile.familyName, 'profile.familyName', 80),
      },
      device: readAuthDevice(body.device),
    }));
  } catch (error) {
    return errorResponse(error);
  }
}

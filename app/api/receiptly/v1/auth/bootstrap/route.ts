import { NextRequest } from 'next/server';
import { bootstrapOwner } from '@/receiptly-api/application/auth';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    const result = await bootstrapOwner({
      bootstrapToken: requiredString(body.bootstrapToken, 'bootstrapToken', 512),
      email: requiredString(body.email, 'email', 320),
      password: requiredString(body.password, 'password', 512),
      displayName: requiredString(body.displayName, 'displayName', 120),
      householdName: requiredString(body.householdName, 'householdName', 120),
    });
    return dataResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

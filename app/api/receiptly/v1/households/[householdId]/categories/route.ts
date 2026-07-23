import { NextRequest } from 'next/server';
import { createCategory, listCategories } from '@/receiptly-api/application/receipts';
import { dataResponse, errorResponse } from '@/receiptly-api/contracts/errors';
import { readObject, requiredString } from '@/receiptly-api/contracts/validation';
import { requireActor } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

type Context = { params: Promise<{ householdId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    return dataResponse(await listCategories(actor, householdId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { householdId } = await context.params;
    const body = readObject(await request.json());
    return dataResponse(await createCategory(actor, householdId, requiredString(body.name, 'name', 80)), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

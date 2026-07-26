import { NextRequest } from 'next/server';
import { confirmScannedCandidate } from '@/receiptly-api/application/receipts';
import { readScannedCandidate } from '@/receiptly-api/contracts/candidate-payload';
import { dataResponse, errorResponse, ReceiptlyError } from '@/receiptly-api/contracts/errors';
import { readObject } from '@/receiptly-api/contracts/validation';
import { requireActor, requireSingleHousehold } from '@/receiptly-api/infrastructure/auth/guard';

export const runtime = 'nodejs';

const readScanId = (value: unknown) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ReceiptlyError(400, 'VALIDATION_ERROR', 'receipt.id from the scan response must be a UUID.');
  }
  return value;
};

/**
 * Send the reviewed `data.receipt` and `data.lines` from POST /receipts/scan.
 * The authenticated user's single active household is resolved on the server.
 */
export async function POST(request: NextRequest) {
  try {
    const body = readObject(await request.json());
    const receipt = readObject(body.receipt);
    const actor = await requireActor(request);
    const householdId = await requireSingleHousehold(actor);
    const result = await confirmScannedCandidate(
      actor,
      householdId,
      readScanId(receipt.id),
      readScannedCandidate({ receipt, lines: body.lines }),
    );
    return dataResponse({ householdId, ...result.detail }, result.created ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}

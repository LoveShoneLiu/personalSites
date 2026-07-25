import { NextResponse } from 'next/server';

export type ReceiptlyErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHENTICATION_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'RECEIPT_TOTAL_MISMATCH'
  | 'IMAGE_INVALID'
  | 'OCR_CONFIGURATION_ERROR'
  | 'OCR_PROVIDER_ERROR'
  | 'OCR_RESULT_INVALID'
  | 'CONFIGURATION_ERROR'
  | 'INTERNAL_ERROR';

export class ReceiptlyError extends Error {
  status: number;

  code: ReceiptlyErrorCode;

  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: ReceiptlyErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errorResponse = (error: unknown) => {
  const requestId = crypto.randomUUID();
  if (error instanceof ReceiptlyError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      { status: error.status },
    );
  }

  // Log only technical metadata. Request bodies, tokens, and receipt content stay out of logs.
  // eslint-disable-next-line no-console
  console.error('Unexpected Receiptly API error.', {
    requestId,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : 'Non-Error value thrown',
  });
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        requestId,
      },
    },
    { status: 500 },
  );
};

export const dataResponse = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });

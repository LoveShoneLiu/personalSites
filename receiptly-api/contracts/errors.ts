import { NextResponse } from 'next/server';

export type ReceiptlyErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHENTICATION_INVALID'
  | 'ACCESS_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_TOKEN_REUSED'
  | 'LOGIN_ATTEMPT_EXPIRED'
  | 'LOGIN_NONCE_INVALID'
  | 'LOGIN_STATE_INVALID'
  | 'PROVIDER_TOKEN_INVALID'
  | 'EMAIL_CODE_INVALID'
  | 'EMAIL_CODE_EXPIRED'
  | 'EMAIL_DELIVERY_FAILED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'EMAIL_PASSWORD_INVALID'
  | 'RATE_LIMITED'
  | 'ACCOUNT_LINK_REQUIRED'
  | 'IDENTITY_ALREADY_LINKED'
  | 'HOUSEHOLD_REQUIRED'
  | 'OWNER_TRANSFER_REQUIRED'
  | 'DELETION_REAUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'RECEIPT_TOTAL_MISMATCH'
  | 'DUPLICATE_RECEIPT'
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
        status: error.status,
        message: error.message,
        data: null,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      { status: error.status, headers: { 'Cache-Control': 'private, no-store' } },
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
      status: 500,
      message: 'An unexpected error occurred.',
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        requestId,
      },
    },
    { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
  );
};

export const dataResponse = <T>(data: T, status = 200) => NextResponse.json(
  {
    status: 0,
    message: 'success',
    data,
  },
  { status, headers: { 'Cache-Control': 'private, no-store' } },
);

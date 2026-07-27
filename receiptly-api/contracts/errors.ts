/** 文件职责：定义稳定错误码，并生成 Receiptly 统一成功或失败响应结构。 */
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
  | 'OWNER_ACCESS_REQUIRED'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'ALREADY_A_MEMBER'
  | 'USER_ALREADY_HAS_HOUSEHOLD'
  | 'MEMBER_NOT_FOUND'
  | 'CANNOT_REMOVE_OWNER'
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

/**
 * 表示可以安全暴露消息和元数据的预期 API 错误。
 * 非预期异常必须交由 `errorResponse` 处理，防止内部细节或凭据泄露给移动端。
 */
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

/**
 * 将异常转换为 Receiptly 稳定的统一响应结构。
 *
 * `status` 与 HTTP 错误状态保持一致以兼容客户端；
 * `error.code` 是客户端分支处理使用的稳定机器可读值。
 */
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

  // 只记录技术元数据；请求体、Token 和小票内容禁止进入日志。
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

/** 使用 Receiptly 统一响应结构返回成功数据。 */
export const dataResponse = <T>(data: T, status = 200, message = 'success') => NextResponse.json(
  {
    status: 0,
    message,
    data,
  },
  { status, headers: { 'Cache-Control': 'private, no-store' } },
);

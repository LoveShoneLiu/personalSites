/** 文件职责：解析 Bearer 身份，并执行服务端会话与家庭成员权限校验。 */
import { NextRequest } from 'next/server';
import {
  and, eq, gt, isNull,
} from 'drizzle-orm';
import { ReceiptlyError } from '@/receiptly-api/contracts/errors';
import {
  getReceiptlyDb,
  householdMembers,
  receiptlySessions,
  receiptlyUsers,
} from '@/receiptly-api/infrastructure/database/client';
import { verifyAccessToken } from './tokens';

export type ReceiptlyActor = {
  userId: string;
  sessionId: string;
  email: string | null;
  displayName: string | null;
};

/**
 * 根据 Bearer Token 和当前数据库状态解析请求身份。
 * 仅校验 JWT 不足以完成认证，因为签发后会话或账号仍可能被撤销。
 */
export const requireActor = async (request: NextRequest): Promise<ReceiptlyActor> => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new ReceiptlyError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }
  const { sub, sid } = await verifyAccessToken(authorization.slice(7));
  const db = getReceiptlyDb();
  const result = await db
    .select({
      id: receiptlyUsers.id,
      email: receiptlyUsers.email,
      displayName: receiptlyUsers.displayName,
      sessionId: receiptlySessions.id,
    })
    .from(receiptlyUsers)
    .innerJoin(receiptlySessions, eq(receiptlySessions.userId, receiptlyUsers.id))
    .where(and(
      eq(receiptlyUsers.id, sub),
      eq(receiptlyUsers.status, 'active'),
      isNull(receiptlyUsers.disabledAt),
      isNull(receiptlyUsers.deletedAt),
      eq(receiptlySessions.id, sid),
      isNull(receiptlySessions.revokedAt),
      gt(receiptlySessions.expiresAt, new Date()),
    ))
    .limit(1);
  const user = result[0];
  if (!user) throw new ReceiptlyError(401, 'AUTHENTICATION_INVALID', 'Authentication is invalid.');
  return {
    userId: user.id,
    sessionId: user.sessionId,
    email: user.email,
    displayName: user.displayName,
  };
};

/**
 * 在服务端强制执行家庭数据隔离。
 * App 提交的家庭 ID 不能作为用户属于该家庭的凭证。
 */
export const requireMembership = async (actor: ReceiptlyActor, householdId: string, ownerOnly = false) => {
  const db = getReceiptlyDb();
  const result = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(and(
      eq(householdMembers.householdId, householdId),
      eq(householdMembers.userId, actor.userId),
      eq(householdMembers.status, 'active'),
    ))
    .limit(1);
  const membership = result[0];
  if (!membership) throw new ReceiptlyError(404, 'NOT_FOUND', 'Resource not found.');
  if (ownerOnly && membership.role !== 'owner') {
    throw new ReceiptlyError(403, 'OWNER_ACCESS_REQUIRED', 'Owner access is required.');
  }
  return membership;
};

/**
 * 只为“用户必须恰好属于一个家庭”的接口推导家庭 ID。
 * 多家庭用户必须调用显式携带家庭 ID 的接口。
 */
export const requireSingleHousehold = async (actor: ReceiptlyActor) => {
  const result = await getReceiptlyDb()
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(and(
      eq(householdMembers.userId, actor.userId),
      eq(householdMembers.status, 'active'),
    ))
    .limit(2);
  if (result.length === 0) {
    throw new ReceiptlyError(409, 'HOUSEHOLD_REQUIRED', '请先创建或加入家庭。');
  }
  if (result.length > 1) {
    throw new ReceiptlyError(409, 'VERSION_CONFLICT', '请求必须指定家庭。');
  }
  return result[0].householdId;
};

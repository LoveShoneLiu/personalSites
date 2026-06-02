import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, smilelifeAuthUsers } from '@/lib/db';

// 只限制最基本的输入长度，避免异常大 payload 进入数据库查询和 bcrypt 计算。
const MAX_ACCOUNT_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 255;

type VerifySmilelifeLoginInput = {
  account: unknown;
  password: unknown;
};

type SmilelifeLoginUser = {
  id: number;
  email: string | null;
  phone: string | null;
};

type SmilelifeLoginResult =
  | {
    success: true;
    user: SmilelifeLoginUser;
  }
  | {
    success: false;
    status: number;
    error: string;
  };

const normalizeAccount = (account: string) => account.trim();

const normalizeEmail = (account: string) => account.trim().toLowerCase();

// 手机号登录允许用户输入空格、短横线等常见格式，查询前统一保留数字和 +。
const normalizePhone = (account: string) => account.replace(/[^\d+]/g, '');

const findSmilelifeUser = async (account: string) => {
  const email = normalizeEmail(account);
  const phone = normalizePhone(account);
  const isEmail = email.includes('@');

  // account 可以是邮箱或手机号；这里根据是否包含 @ 决定查哪个唯一字段。
  const result = await db
    .select()
    .from(smilelifeAuthUsers)
    .where(
      isEmail
        ? eq(smilelifeAuthUsers.email, email)
        : eq(smilelifeAuthUsers.phone, phone),
    )
    .limit(1);

  return result[0] ?? null;
};

const isInvalidLoginInput = (account: string, password: string) => (
  !account
  || !password
  || account.length > MAX_ACCOUNT_LENGTH
  || password.length > MAX_PASSWORD_LENGTH
);

export const verifySmilelifeUserLogin = async ({
  account: rawAccount,
  password: rawPassword,
}: VerifySmilelifeLoginInput): Promise<SmilelifeLoginResult> => {
  const account = typeof rawAccount === 'string'
    ? normalizeAccount(rawAccount)
    : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';

  if (isInvalidLoginInput(account, password)) {
    return {
      success: false,
      status: 400,
      error: 'Invalid account or password',
    };
  }

  const user = await findSmilelifeUser(account);

  // 不区分“用户不存在”和“账号被停用”，避免对外暴露账号是否存在。
  if (!user || user.status !== 'active') {
    return {
      success: false,
      status: 401,
      error: 'Invalid account or password',
    };
  }

  // 数据库只保存 bcrypt hash，不保存明文密码。
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    return {
      success: false,
      status: 401,
      error: 'Invalid account or password',
    };
  }

  // 登录成功时只更新最后登录时间；当前接口不创建 session 或 token。
  await db
    .update(smilelifeAuthUsers)
    .set({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(smilelifeAuthUsers.id, user.id));

  return {
    success: true,
    user: {
      // 只返回调用方需要的最小用户信息，不返回 password_hash/status 等内部字段。
      id: user.id,
      email: user.email,
      phone: user.phone,
    },
  };
};

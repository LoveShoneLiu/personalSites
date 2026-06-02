import { NextRequest, NextResponse } from 'next/server';
import { verifySmilelifeUserLogin } from '@/lib/server/smilelifeAuth';

// SmileLife 登录接口只负责 HTTP 层：CORS、请求解析、响应封装。
// 账号校验逻辑放在 lib/server/smilelifeAuth.ts，避免和本站后台登录耦合。
const getAllowedOrigins = () => (
  process.env.SMILELIFE_ALLOWED_ORIGINS || ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalhostOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    // 开发阶段允许 http://localhost 的任意端口调用，比如 3001、5173、8080。
    return url.protocol === 'http:' && url.hostname === 'localhost';
  } catch {
    return false;
  }
};

const isAllowedOrigin = (origin: string, allowedOrigins: string[]) => (
  allowedOrigins.includes(origin)
  || (
    allowedOrigins.includes('http://localhost')
    && isLocalhostOrigin(origin)
  )
);

const buildCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const headers = new Headers();

  // 浏览器跨域 POST 会先发送 OPTIONS 预检请求，这些头用于回应预检。
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Vary', 'Origin');

  if (origin && isAllowedOrigin(origin, allowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  return headers;
};

const isOriginAllowed = (request: NextRequest) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  // 非浏览器请求（例如 curl）通常没有 Origin；未配置白名单时默认放行，方便本地调试。
  if (!origin || allowedOrigins.length === 0) {
    return true;
  }

  return isAllowedOrigin(origin, allowedOrigins);
};

const jsonResponse = (
  request: NextRequest,
  body: unknown,
  init?: ResponseInit,
) => NextResponse.json(body, {
  ...init,
  headers: buildCorsHeaders(request),
});

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: isOriginAllowed(request) ? 204 : 403,
    headers: buildCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return jsonResponse(
      request,
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const result = await verifySmilelifeUserLogin({
      account: body.account,
      password: body.password,
    });

    if (!result.success) {
      return jsonResponse(
        request,
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return jsonResponse(request, {
      success: true,
      user: result.user,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('SmileLife login error:', error);

    return jsonResponse(
      request,
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

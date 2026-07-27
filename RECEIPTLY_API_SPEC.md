# receiptly API 接口方案

状态：MVP v1
日期：2026-07-23  
生产 API Base URL：`https://liushaofei.cn/api/receiptly/v1`

App 只在环境配置中保存 Base URL，具体请求路径继续使用本文中的相对路径：

```text
production  https://liushaofei.cn/api/receiptly/v1
development http://<开发电脑局域网IP>:3000/api/receiptly/v1
```

iOS 模拟器可使用 `http://127.0.0.1:3000/api/receiptly/v1`；真机不能使用 `localhost` 或
`127.0.0.1` 访问开发电脑，需要使用同一局域网内的电脑 IP。生产环境必须使用 HTTPS。

## 1. 接口边界

Expo 客户端位于独立仓库 `/Users/shaofeiliu/Documents/code/receiptly/apps/mobile`。接口服务位于当前 `personalSites` 仓库，但所有实现放入专属 `receiptly-api/` 目录，只通过 `/api/receiptly/v1/*` 暴露，不复用个人站认证和业务数据库模块。

```text
app/api/receiptly/v1/*       # personalSites 中的薄 HTTP adapter
        ↓
receiptly-api/contracts      # DTO、schema、错误码、OpenAPI
        ↓
receiptly-api/application    # use cases、权限与事务编排
        ↓
receiptly-api/domain         # 状态机、金额、可比性纯规则
        ↓
receiptly-api/infrastructure # 独立 DB/auth/storage/job adapters
```

代码与运行约束：

- Receiptly 数据库连接使用 `RECEIPTLY_DATABASE_URL`，不得导入个人站 `lib/db`。
- Receiptly access/refresh token 使用独立 Secret，不能接受个人站 admin 登录状态。
- Route Handler 不得包含 SQL 或业务状态转换。
- Expo 与 API 不共享仓库或运行依赖，通过 OpenAPI contract 和 contract test 保持一致。

接口分为四个交付切片：

- A：认证、家庭、分类、手动收据、确认、基础分析和删除。
- B：私有上传、OCR 候选、重试、别名规则和重复校验。
- C：商品、历史价格、通用聚合、预算和洞察。
- D：成员邀请、导出、审计、隐私和完整账户管理。

## 2. 通用协议

### 2.1 身份凭据

- Expo：`Authorization: Bearer <access-token>`。
- Refresh：独立 refresh token rotation 接口，token 保存在系统安全存储。
- 所有业务接口均由服务端从 session/token 解析 `userId`。
- `householdId` 是访问目标，不是授权证明；服务端必须验证 active membership。

### 2.2 请求头

| Header | 用途 |
| --- | --- |
| `Content-Type: application/json` | JSON 写请求 |
| `Authorization` | Mobile access token |
| `Idempotency-Key` | 创建、确认、邀请、导出等不可重复操作 |
| `If-Match: "<version>"` | 草稿/设置乐观锁 |
| `X-Request-ID` | 可选客户端 request ID；服务端始终返回最终 ID |

### 2.3 分页

列表接口使用 cursor pagination：

```json
{
  "status": 0,
  "message": "success",
  "data": {
    "items": [],
    "page": {
      "nextCursor": "opaque-or-null",
      "hasMore": false
    }
  }
}
```

`limit` 默认 20，最大 100。禁止让客户端传 SQL offset、列名或原始排序表达式。

### 2.4 成功响应

单对象：

```json
{
  "status": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

异步任务：

```json
{
  "status": 0,
  "message": "success",
  "data": {
    "jobId": "uuid",
    "status": "queued",
    "statusUrl": "/api/receiptly/v1/jobs/uuid"
  }
}
```

### 2.5 错误响应

```json
{
  "status": 422,
  "message": "Receipt total does not match confirmed lines.",
  "data": null,
  "error": {
    "code": "RECEIPT_TOTAL_MISMATCH",
    "message": "Receipt total does not match confirmed lines.",
    "fieldErrors": {
      "totalCents": ["Difference is 200 cents."]
    },
    "details": {
      "differenceCents": 200
    },
    "requestId": "req_..."
  }
}
```

所有 Receiptly 响应都使用同一顶层 envelope：

- `status`: `0` 表示业务成功；非 `0` 时使用对应 HTTP 状态码。
- `message`: 成功默认为 `success`，部分写操作返回明确成功文案；失败时为可展示的错误文案。
- `data`: 成功时为业务数据；失败时固定为 `null`。
- `error`: 仅失败时存在，继续提供稳定的 `code`、`details` 和 `requestId` 给 App 做程序化处理。

HTTP 状态码不因 envelope 改变：成功仍为 `200/201/202`，客户端错误仍为 `4xx`，服务端错误仍为
`5xx`。App 应优先根据 HTTP 状态和 `error.code` 分支，使用顶层 `message` 展示错误。

通用状态码：

| 状态 | 场景 |
| ---: | --- |
| 200/201/204 | 查询/创建/无内容成功 |
| 400 | JSON、查询参数或业务输入无效 |
| 401 | 未登录或 token 失效 |
| 403 | 已登录但角色不允许 |
| 404 | 无权访问和不存在统一返回，避免泄漏跨家庭对象 |
| 409 | 版本冲突、非法状态转换、重复资源 |
| 413/415 | 文件过大/不支持类型 |
| 422 | 可理解但无法确认，例如总额不符 |
| 429 | 限流 |
| 500/503 | 内部错误/外部 OCR 暂不可用 |

### 2.6 时间和金额

- ID：UUID 字符串。
- 时间戳：ISO 8601 UTC，例如 `2026-07-23T02:10:00Z`。
- 购物日期：家庭本地 `YYYY-MM-DD`。
- 金额：整数 cents，例如 `$12.34 → 1234`。
- 币种：ISO 4217，MVP 固定 `NZD`。
- 数量：十进制定点字符串，例如 `"1.5"`，避免 JSON 浮点作为计算真值。

### 2.7 扫描候选与确认页契约（已确认）

扫描 API 返回的候选内容永远处于 `draft`、`processing` 或 `needs_review`，不会自动进入统计。所有无法可靠识别的字段必须返回 `null`，不得用 `0` 代替缺失值；`0` 是合法的免费商品或零金额值。

```ts
type ReceiptCandidateLine = {
  sortOrder: number;
  rawText: string | null;
  productName: string | null;
  quantity: string | null;
  unit: string | null;
  unitPriceCents: number | null;
  unitPriceBasis: string | null;
  linePriceCents: number | null;
  confidence: number | null;
  source: 'ai' | 'manual';
  included: boolean;
};

type ReceiptCandidate = {
  storeName: string | null;
  receiptNumber: string | null;
  purchasedOn: string | null;
  purchasedAtLocal: string | null;
  currency: string | null;
  declaredTotalCents: number | null;
  lines: ReceiptCandidateLine[];
};
```

- `sortOrder` 从 `0` 开始，在同一张收据内唯一且稳定。
- `quantity` 使用十进制字符串，例如 `"0.860"`。
- 当前扫描与商品列表不返回自动商品品类；品类在未来确认流程另行决定。
- `linePriceCents: null`、`declaredTotalCents: null` 或其他确认所需字段缺失时，确认接口必须拒绝。

扫描响应同时返回：

```ts
type CandidateReconciliation = {
  lineTotalCents: number;
  adjustmentTotalCents: number;
  declaredTotalCents: number | null;
  differenceCents: number | null;
  isBalanced: boolean;
  canConfirm: boolean;
  blockingReasons: string[];
};
```

## 3. Auth 接口

### 3.1 iOS 登录 MVP 最终契约（2026-07-26）

MVP App 只开放邮箱＋密码注册和邮箱＋密码登录。邮箱验证码仅用于注册时验证邮箱；App 登录页
不展示 Google、Apple 或验证码免密登录入口。Google/Apple 服务端代码暂时保留，但不属于
本次 MVP 的联调、生产配置和发布范围，延后到下一版本启用。

所有已实现的登录方式都签发 Receiptly 自己的 Session；第三方 Token 永远不得用于访问业务接口。

统一设备结构：

```json
{
  "installationId": "客户端安装时生成并保存在安全存储中的 UUID",
  "platform": "ios",
  "name": "Shaofei’s iPhone"
}
```

`name` 可为 `null`，不能作为安全凭据。

#### Challenge（下一版本 Google/Apple 登录）

`POST /auth/challenges`

```json
{ "provider": "apple" }
```

`provider` 只能是 `apple | google`。响应：

```json
{
  "data": {
    "attemptId": "uuid",
    "nonce": "raw-random-nonce",
    "state": "opaque-state",
    "expiresIn": 300
  }
}
```

Challenge 5 分钟有效且只能使用一次。Apple App 对 `nonce` 做 SHA-256 后传给 Apple SDK；登录 Receiptly 时只回传 `attemptId` 和 `state`。服务端通过 `attemptId` 取出 raw nonce，计算 SHA-256 后与 Apple identity token 的 nonce claim 比较。

#### Google（下一版本）

`POST /auth/google`

```json
{
  "attemptId": "uuid",
  "state": "challenge返回的opaque-state",
  "idToken": "google-id-token",
  "device": {
    "installationId": "uuid",
    "platform": "ios",
    "name": "iPhone 16 Pro"
  }
}
```

MVP 验证签名、`iss`、`aud`、`azp`、`exp` 和 `sub`，使用 `sub` 作为身份主键。本阶段不要求 authorization code，也不承诺 Google nonce 验证。

#### Apple（下一版本）

`POST /auth/apple`

```json
{
  "attemptId": "uuid",
  "state": "challenge返回的opaque-state",
  "identityToken": "apple-identity-token",
  "authorizationCode": "apple-authorization-code",
  "profile": {
    "email": null,
    "givenName": null,
    "familyName": null
  },
  "device": {
    "installationId": "uuid",
    "platform": "ios",
    "name": "iPhone 16 Pro"
  }
}
```

`authorizationCode` 必填；profile 各字段允许 null。第一次收到的姓名和邮箱会保存，后续 null 不覆盖已有值；Apple 私密转发邮箱是合法邮箱。服务端交换并加密保存 Apple refresh token，用于删除账号时撤销授权。

#### 邮箱验证码

`POST /auth/email/request-code`

```json
{
  "email": "user@example.com",
  "locale": "zh-CN"
}
```

`locale` 只接受 `en-NZ` 或 `zh-CN`，服务端据此选择英文或中文验证码邮件。
旧版客户端未传时默认 `en-NZ`。

成功固定返回 `202`：

```json
{
  "data": {
    "expiresIn": 600,
    "resendAfter": 60
  }
}
```

验证码通过 Resend 发送：6 位数字、10 分钟有效、60 秒后可重发、最多尝试 5 次、验证成功自动注册。邮箱去除首尾空格并转小写；数据库只保存验证码哈希。

`POST /auth/email/verify-code`

```json
{
  "email": "user@example.com",
  "code": "123456",
  "device": {
    "installationId": "uuid",
    "platform": "ios",
    "name": null
  }
}
```

#### 邮箱＋密码注册

注册前先调用 `POST /auth/email/request-code` 验证邮箱，然后调用：

`POST /auth/email/register`

```json
{
  "email": "user@example.com",
  "password": "user-password",
  "code": "123456",
  "displayName": "Shaofei Liu",
  "device": {
    "installationId": "uuid",
    "platform": "ios",
    "name": "iPhone 16 Pro"
  }
}
```

`displayName` 可为 `null`；为空时使用邮箱 `@` 前的部分作为初始名称。密码必须至少 8 个字符且
UTF-8 编码不超过 72 字节。服务端使用 bcrypt cost 12 保存哈希，永远不保存或返回明文密码。
验证码只能使用一次。新用户返回 `201` 和统一 Session 响应；已经通过验证码免密登录的邮箱可
通过此接口设置初始密码。

#### 邮箱＋密码登录

`POST /auth/email/login`

```json
{
  "email": "user@example.com",
  "password": "user-password",
  "device": {
    "installationId": "uuid",
    "platform": "ios",
    "name": "iPhone 16 Pro"
  }
}
```

成功返回 `200` 和统一 Session 响应。邮箱或密码错误统一返回
`EMAIL_PASSWORD_INVALID`，不区分邮箱是否存在。连续失败 5 次后，该账号锁定 15 分钟。
验证码免密登录接口在服务端保留，但 MVP App 不展示该入口。忘记密码和修改密码接口不在本次范围内。

#### 统一登录响应

邮箱注册、密码登录以及后续启用的其他登录方式均返回：

```json
{
  "data": {
    "accessToken": "receiptly-access-token",
    "refreshToken": "rotating-refresh-token",
    "expiresIn": 900,
    "sessionId": "uuid",
    "user": {
      "id": "uuid",
      "email": null,
      "displayName": null
    },
    "households": [],
    "activeHouseholdId": null,
    "onboardingState": "needs_profile",
    "isNewUser": true
  }
}
```

`onboardingState` 为 `needs_profile | needs_household | ready`。当前 MVP 不自动创建家庭，也不按相同邮箱自动合并不同 Provider 身份。

#### Refresh

`POST /auth/refresh`

```json
{
  "refreshToken": "current-refresh-token",
  "installationId": "与登录时相同的UUID"
}
```

```json
{
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 900,
    "sessionId": "new-session-uuid"
  }
}
```

Access Token 有效 15 分钟；Refresh Token 有效 30 天且每次轮换。旧 Refresh Token 再次出现时，服务端撤销该 token family。

#### Logout

`POST /auth/logout`

```http
Authorization: Bearer <accessToken>
```

```json
{ "data": { "loggedOut": true } }
```

只撤销当前设备 Session。

#### Me

`GET /me`

```http
Authorization: Bearer <accessToken>
```

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Shaofei Liu"
    },
    "households": [],
    "activeHouseholdId": null,
    "onboardingState": "needs_household"
  }
}
```

不提供重复的 `/me/households`。

#### 创建家庭

`POST /households`

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "Liu Family",
  "timezone": "Pacific/Auckland",
  "currency": "NZD"
}
```

返回 `201`：

```json
{
  "data": {
    "household": {
      "id": "uuid",
      "name": "Liu Family",
      "role": "owner",
      "timezone": "Pacific/Auckland",
      "currency": "NZD"
    },
    "activeHouseholdId": "uuid",
    "onboardingState": "ready"
  }
}
```

#### 删除账号

`DELETE /me` 要求 Bearer Token。唯一 Owner 且家庭无其他成员时连同家庭数据删除；有其他成员时返回 `OWNER_TRANSFER_REQUIRED`。Apple身份会先撤销 Apple授权。用户身份做不可逆匿名化，所有 Session 同时撤销。

#### MVP 稳定错误码

| HTTP | code | 场景 |
| ---: | --- | --- |
| 401 | `ACCESS_TOKEN_EXPIRED` | Access Token 过期，App只刷新一次 |
| 401 | `REFRESH_TOKEN_INVALID` | Refresh Token无效、过期或设备不匹配 |
| 401 | `REFRESH_TOKEN_REUSED` | 已轮换 Token再次出现，撤销 token family |
| 401 | `LOGIN_ATTEMPT_EXPIRED` | Challenge过期或已使用 |
| 401 | `LOGIN_NONCE_INVALID` | Apple nonce 不匹配 |
| 401 | `LOGIN_STATE_INVALID` | state 不匹配 |
| 401 | `PROVIDER_TOKEN_INVALID` | Google/Apple凭据验证失败 |
| 401 | `EMAIL_CODE_INVALID` | 邮箱验证码错误或已使用 |
| 401 | `EMAIL_CODE_EXPIRED` | 邮箱验证码过期 |
| 401 | `EMAIL_PASSWORD_INVALID` | 邮箱或密码错误 |
| 409 | `EMAIL_ALREADY_REGISTERED` | 邮箱已设置密码，应直接登录 |
| 503 | `EMAIL_DELIVERY_FAILED` | Resend 暂时无法发送验证码 |
| 409 | `ACCOUNT_LINK_REQUIRED` | 相同邮箱已有其他登录方式 |
| 409 | `HOUSEHOLD_REQUIRED` | 业务操作前尚未创建/加入家庭 |
| 409 | `OWNER_TRANSFER_REQUIRED` | 删除账号前必须转让Owner |
| 409 | `DUPLICATE_RECEIPT` | 同一家庭中相同小票号、日期和总额的小票已经入账 |
| 429 | `RATE_LIMITED` | 验证码发送过于频繁 |

`GET /mock/session` 仅 `NODE_ENV=development` 可用；preview 和 production 返回 404。开发测试用户使用 CLI 幂等关联 mock household：

```bash
npm run receiptly:dev:link-mock -- --email user@example.com
```

### 3.2 后续认证能力

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| A | POST | `/auth/logout` | User | 撤销当前 session/token |
| A | POST | `/auth/refresh` | Refresh token | Mobile 刷新并轮换 token |
| A | GET | `/me` | User | 当前用户、active household、角色和功能开关 |
| D | POST | `/auth/forgot-password` | Public | 发送一次性重置链接，响应不泄漏账号存在性 |
| D | POST | `/auth/reset-password` | Reset token | 设置新密码并撤销旧 session |
| D | POST | `/auth/change-password` | User | 修改密码并可撤销其他 session |
| D | GET | `/auth/sessions` | User | 查看自己的 active sessions |
| D | DELETE | `/auth/sessions/:sessionId` | User | 撤销指定 session |

## 4. Household 与成员接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| A | POST | `/households` | User without household | 创建家庭并成为 Owner |
| A | GET | `/households/:householdId` | Member | 家庭名称、时区、币种和当前角色 |
| A | GET | `/households/:householdId/members` | Member | 当前有效成员列表 |
| A | DELETE | `/households/:householdId/members/:userId` | Owner | 软删除普通成员 |
| A | POST | `/households/:householdId/invitations` | Owner | 通过邮箱发送一次性邀请码 |
| A | POST | `/household-invitations/preview` | User | 输入邀请码并预览家庭 |
| A | POST | `/household-invitations/accept` | User | 明确同意并加入家庭 |
| D | PATCH | `/households/:householdId` | Owner | 修改名称、时区和设置，要求 `If-Match` |
| D | DELETE | `/households/:householdId` | Owner | 发起家庭删除，强二次确认 |
| D | GET | `/households/:householdId/deletion` | Owner | 查询家庭删除状态和实际范围 |
| D | PATCH | `/households/:householdId/members/:userId` | Owner | 修改成员角色/状态 |
| D | GET | `/households/:householdId/invitations` | Owner | 查看未完成邀请，不返回 token |
| D | DELETE | `/households/:householdId/invitations/:invitationId` | Owner | 撤销邀请 |

创建邀请请求：

```json
{
  "email": "member@example.com",
  "locale": "en-NZ"
}
```

`locale` 只接受 `en-NZ` 或 `zh-CN`，并决定家庭邀请邮件的主题和正文语言。
旧版客户端未传时默认 `en-NZ`。

家庭邀请 MVP 约束：

- 一个用户最多只有一个 `active` 家庭成员关系；数据库使用部分唯一索引兜底。
- 邀请码为 8 位大写字母和数字，排除 `0/O/1/I`，不区分输入大小写，7 天有效且只能使用一次。
- 数据库只保存邀请码 HMAC，原始邀请码只进入 Resend 邮件，不进入日志。
- 被邀请人使用邀请码调用 `preview`，确认家庭名称后再调用 `accept`。
- 接受时当前登录邮箱必须与邀请邮箱一致。
- Owner 每小时最多发送 5 次邀请，同一家庭同一邮箱至少间隔 60 秒。
- 单个登录账号 15 分钟最多查询邀请码 10 次。
- 删除成员只把 membership 标记为 `removed`；该成员过去确认的小票继续保留。
- 第一版不支持成员自行退出、Owner 转让、多个家庭或邀请链接。

邀请预览和接受请求：

```json
{
  "code": "A7KM3X9P"
}
```

新增稳定错误码：

| HTTP | code | 场景 |
| ---: | --- | --- |
| 403 | `OWNER_ACCESS_REQUIRED` | 只有 Owner 可以执行 |
| 404 | `INVITATION_NOT_FOUND` | 邀请码不存在或已撤销 |
| 410 | `INVITATION_EXPIRED` | 邀请码已过期 |
| 409 | `INVITATION_ALREADY_ACCEPTED` | 邀请码已使用 |
| 403 | `INVITATION_EMAIL_MISMATCH` | 登录邮箱与邀请邮箱不同 |
| 409 | `ALREADY_A_MEMBER` | 用户已经属于目标家庭 |
| 409 | `USER_ALREADY_HAS_HOUSEHOLD` | 用户已经加入其他家庭 |
| 404 | `MEMBER_NOT_FOUND` | 目标普通成员不存在 |
| 409 | `CANNOT_REMOVE_OWNER` | 尝试删除 Owner |

## 5. 分类接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |

分类响应必须返回稳定 `id`；改名不能改变历史行引用。

## 6. 收据接口

### 6.1 草稿和列表

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| A | POST | `/households/:householdId/receipts` | Member | 创建手动或待上传草稿 |
| A | GET | `/households/:householdId/receipts` | Member | 按状态、日期、创建人和门店筛选列表 |
| A | GET | `/households/:householdId/receipts/:receiptId` | Member | 收据头、行、调整项、候选摘要和版本 |
| A | PATCH | `/households/:householdId/receipts/:receiptId` | Creator/Owner | 保存头部和草稿元数据 |
| A | DELETE | `/households/:householdId/receipts/:receiptId` | Creator/Owner | 删除收据并撤销派生数据 |
| A | GET | `/households/:householdId/receipts/:receiptId/reconciliation` | Creator/Owner | 行合计、调整项、差额和阻塞问题 |

创建手动草稿：

```json
{
  "entryMode": "manual",
  "storeName": "PAK'nSAVE Mt Albert",
  "purchasedOn": "2026-07-23",
  "currency": "NZD",
  "totalCents": 2450,
  "clientDraftId": "device-generated-uuid"
}
```

### 6.2 收据行

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| A | POST | `/receipts/:receiptId/lines` | Creator/Owner | 添加手动行 |
| A | PATCH | `/receipts/:receiptId/lines/:lineId` | Creator/Owner | 编辑名称、数量、规格、金额、类别、标记 |
| A | DELETE | `/receipts/:receiptId/lines/:lineId` | Creator/Owner | 删除草稿行 |
| A | PUT | `/receipts/:receiptId/lines/order` | Creator/Owner | 批量调整行顺序 |
| A | PATCH | `/receipts/:receiptId/lines/bulk` | Creator/Owner | 批量分类、包含/排除和确认字段 |
| B | POST | `/receipts/:receiptId/lines/:lineId/remember-rule` | Creator/Owner | 保存本家庭别名/分类规则 |

行写请求示例：

```json
{
  "displayName": "Anchor Blue Milk",
  "rawText": "ANCH BLUE 2L",
  "quantity": "1",
  "pack": {
    "value": "2",
    "unit": "L"
  },
  "lineCents": 489,
  "categoryId": "uuid",
  "promotion": "none",
  "lineStatus": "included"
}
```

### 6.3 调整项、确认和重新复核

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| A | POST | `/receipts/:receiptId/adjustments` | Creator/Owner | 新增折扣、退款、税费或非商品费用 |
| A | PATCH | `/receipts/:receiptId/adjustments/:adjustmentId` | Creator/Owner | 修改调整项 |
| A | DELETE | `/receipts/:receiptId/adjustments/:adjustmentId` | Creator/Owner | 删除调整项 |
| A | POST | `/receipts/:receiptId/validate` | Creator/Owner | 返回确认前完整校验，不改变状态 |
| A | POST | `/receipts/:receiptId/confirm` | Creator/Owner | 原子确认并创建派生价格观测 |
| A | POST | `/receipts/:receiptId/reopen` | Creator/Owner | `confirmed → needs_review` 并撤销正式派生数据 |

确认请求：

```json
{
  "expectedVersion": 7,
  "acknowledgements": {
    "headerConfirmed": true,
    "linesConfirmed": true,
    "totalConfirmed": true
  }
}
```

接口必须返回最新 receipt、confirmation snapshot 和被创建/撤销的派生数据摘要。重复 `Idempotency-Key` 不得重复创建观测或审计事件。

### 6.4 重复检测

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| B | GET | `/receipts/:receiptId/duplicate-candidates` | Creator/Owner | 查询同家庭 hash/门店/日期/总额候选 |
| B | POST | `/receipts/:receiptId/duplicate-decision` | Creator/Owner | 记录打开已有、取消或明确另存 |

系统不得自动删除疑似重复收据。

## 7. 图片上传和 OCR 接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| B | POST | `/receipts/:receiptId/images/upload-intent` | Creator/Owner | 校验计划上传并返回短期上传凭据 |
| B | POST | `/receipts/:receiptId/images/complete` | Creator/Owner | 服务端验证对象、MIME、大小和 hash |
| B | GET | `/receipts/:receiptId/images` | Creator/Owner | 图片元数据，不返回永久公开 URL |
| B | POST | `/receipts/:receiptId/images/:imageId/access-url` | Creator/Owner | 返回短期受控查看 URL |
| B | DELETE | `/receipts/:receiptId/images/:imageId` | Creator/Owner | 删除原图，不必删除用户确认的账本数据 |
| B | POST | `/receipts/:receiptId/extractions` | Creator/Owner | 创建异步 OCR 任务 |
| B | GET | `/receipts/:receiptId/extractions` | Creator/Owner | 提取历史及供应商/模型/状态摘要 |
| B | GET | `/receipts/:receiptId/extractions/:runId` | Creator/Owner | 状态、字段候选和置信度 |
| B | POST | `/receipts/:receiptId/extractions/:runId/retry` | Creator/Owner | 重试失败任务，要求幂等键 |
| B | POST | `/receipts/:receiptId/extractions/:runId/cancel` | Creator/Owner | 尽力取消，不删除手动草稿 |
| B | POST | `/receipts/:receiptId/extractions/:runId/apply` | Creator/Owner | 把选定候选复制到可编辑草稿，不能确认 |

上传意图：

```json
{
  "fileName": "receipt.heic",
  "mimeType": "image/heic",
  "sizeBytes": 1849200,
  "sha256": "hex"
}
```

`apply` 只允许写入 draft/needs_review 字段。OCR job、webhook 或任何后台服务都无权调用 `confirmReceipt`。

## 8. 商品、别名和价格接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| C | GET | `/households/:householdId/products` | Member | 按 canonical、alias 和原始文本搜索 |
| C | POST | `/households/:householdId/products` | Owner | 创建家庭自定义商品 |
| C | GET | `/households/:householdId/products/:productId` | Member | 商品、别名、样本和资料边界 |
| C | PATCH | `/households/:householdId/products/:productId` | Owner | 修改显示名/状态 |
| C | GET | `/households/:householdId/products/:productId/prices` | Member | 日期、门店、规格、可比性筛选后的历史价格 |
| C | GET | `/households/:householdId/products/:productId/observations` | Member | 每次购买价格明细和下钻引用 |
| C | GET | `/households/:householdId/aliases` | Member | 别名规则列表和命中来源 |
| C | POST | `/households/:householdId/aliases` | Owner | 创建别名规则 |
| C | PATCH | `/households/:householdId/aliases/:aliasId` | Owner | 修改或停用规则 |
| C | DELETE | `/households/:householdId/aliases/:aliasId` | Owner | 停用/删除无历史依赖规则 |
| C | POST | `/households/:householdId/products/merge` | Owner | 合并商品并触发历史重算 |
| C | POST | `/households/:householdId/products/:productId/split` | Owner | 拆分选定 aliases/lines 并重算 |
| C | POST | `/households/:householdId/product-merge-suggestions` | Member | 成员提交合并建议 |
| C | GET | `/households/:householdId/product-merge-suggestions` | Owner | Owner 审核队列 |
| C | POST | `/households/:householdId/product-merge-suggestions/:id/decision` | Owner | 接受或拒绝 |

价格响应必须包含：

```json
{
  "data": {
    "scope": "household_confirmed_receipts_only",
    "window": { "start": "2026-01-01", "end": "2026-07-24" },
    "sampleCount": 5,
    "comparableCount": 3,
    "nonComparableCount": 2,
    "byStore": [],
    "observations": []
  }
}
```

不得返回“当前价”“原价”“市场最低价”字段。

## 9. Dashboard 与分析接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| A | GET | `/households/:householdId/dashboard` | Member | 本月总额、确认收据数、待确认数、更新时间 |
| A | GET | `/households/:householdId/analytics/spend` | Member | 通用单主分组聚合 |
| A | GET | `/households/:householdId/analytics/lines` | Member | 汇总数字的行项目下钻 |
| C | GET | `/households/:householdId/analytics/product-ranking` | Member | 商品花费排名预设 |
| C | GET | `/households/:householdId/analytics/store-spend` | Member | 门店花费预设 |
| C | GET | `/households/:householdId/analytics/data-quality` | Member | 未分类、无价格、排除、重复疑似和覆盖率 |

通用分析 query：

```text
GET /analytics/spend
  ?start=2026-07-01
  &end=2026-08-01
  &storeId=id1,id2
  &categoryId=id3
  &productId=id4
  &creatorId=id5
  &comparability=comparable
  &groupBy=category
  &metric=total_spend
  &sort=desc
  &cursor=...
```

允许值采用枚举白名单：

- `groupBy`: `product | category | store | day | week | month`
- `metric`: `total_spend | purchase_count | receipt_count | quantity | average_paid | min_price | latest_price | median_price`
- 首期每个请求只允许一个 `groupBy`。
- 所有查询隐式且强制只读 `confirmed + included + not deleted` 数据，不提供关闭此条件的参数。

## 10. Budget 与洞察接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| C | GET | `/households/:householdId/budgets` | Member | 查看家庭预算 |
| C | POST | `/households/:householdId/budgets` | Owner | 新建类别预算 |
| C | PATCH | `/households/:householdId/budgets/:budgetId` | Owner | 修改金额、周期、阈值、开关 |
| C | DELETE | `/households/:householdId/budgets/:budgetId` | Owner | 停用预算 |
| C | GET | `/households/:householdId/insight-settings` | Member | 洞察开关和非医疗说明版本 |
| C | PATCH | `/households/:householdId/insight-settings` | Owner | 显式开启/关闭洞察 |
| C | GET | `/households/:householdId/insights` | Member | 可解释洞察列表 |
| C | GET | `/households/:householdId/insights/:insightId` | Member | 依据、窗口、样本、算法版本和下钻 |
| C | POST | `/households/:householdId/insights/:insightId/dismiss` | Member | 关闭单条提示 |
| C | POST | `/households/:householdId/insights/:insightId/feedback` | Member | 有限枚举反馈，不记录商品文本 |

每条洞察必须返回：`evidence`、`dateWindow`、`sampleCount`、`coverage`、`algorithmVersion`、`limitations`。禁止返回健康评分或医学建议。

## 11. 导出、审计与隐私接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| D | POST | `/households/:householdId/exports` | Owner | 创建 CSV 导出任务 |
| D | GET | `/households/:householdId/exports` | Owner | 导出任务列表 |
| D | GET | `/households/:householdId/exports/:exportId` | Owner | 状态、范围、过期时间 |
| D | POST | `/households/:householdId/exports/:exportId/download-url` | Owner | 生成短期访问链接 |
| D | DELETE | `/households/:householdId/exports/:exportId` | Owner | 提前销毁导出文件 |
| D | GET | `/households/:householdId/audit-events` | Owner | 按 actor/action/object/date 查询审计摘要 |
| D | GET | `/privacy/data-processing` | Public/User | 当前存储、AI 供应商、保留和训练边界说明 |
| D | GET | `/privacy/consents` | User | 当前用户确认过的说明版本 |
| D | POST | `/privacy/consents` | User | 记录显式 opt-in，例如开启洞察 |
| D | DELETE | `/me` | User | 请求删除个人账号；家庭 Owner 需先处理所有权 |

CSV 导出默认只包含已确认收据、正式行、分类、商品和价格观测；不包含原图 URL、OCR prompt、token、支付信息或 AI 内部元数据。

## 12. Job 与内部回调接口

| Slice | 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- | --- |
| B | GET | `/jobs/:jobId` | Job owner/household member | 查询 OCR/导出/删除任务状态 |
| B | POST | `/jobs/:jobId/cancel` | Job owner | 请求取消允许取消的任务 |
| B | POST | `/internal/extraction-callback` | Signed service identity | OCR workflow 回写候选 |
| D | POST | `/internal/export-callback` | Signed service identity | 导出任务完成回调 |
| D | POST | `/internal/storage-deletion-callback` | Signed service identity | 私有文件删除结果 |

内部接口不使用普通用户 session，必须验证签名、时间戳、防重放 nonce 和允许的 source。内部回调仍然不能确认收据。

## 13. 健康与运行接口

| 方法 | 路径 | 暴露范围 | 用途 |
| --- | --- | --- | --- |
| GET | `/health/live` | Platform | 进程存活，不访问外部依赖 |
| GET | `/health/ready` | Protected/platform | 数据库及必要依赖就绪 |
| GET | `/version` | Authenticated or internal | commit SHA、API contract version，不泄漏 Secret |

## 14. Next.js Route Handler 边界

个人站中的 Route Handler 只是 Receiptly API 的 HTTP adapter：

- 只能调用 `receiptly-api/application` 中的 command/query。
- 不能复制授权、状态机、SQL 或聚合逻辑。
- `receiptly-api/contracts` 是 Expo 与服务端之间的正式契约真值。
- 所有对 Expo 开放的能力必须位于 `/api/receiptly/v1`。
- 个人站页面和旧 `/api/auth`、`/api/posts` 不得直接调用 Receiptly repository。

## 15. 接口与领域命令映射

| HTTP 接口 | Domain command/query |
| --- | --- |
| `POST /receipts` | `createDraftReceipt` |
| `PATCH /receipts/:id` | `saveReceiptDraft` |
| `POST /receipts/:id/validate` | `validateReceiptForConfirmation` |
| `POST /receipts/:id/confirm` | `confirmReceipt` |
| `POST /receipts/:id/reopen` | `reopenConfirmedReceipt` |
| `DELETE /receipts/:id` | `deleteReceipt` |
| `POST /extractions` | `startReceiptExtraction` |
| `POST /extractions/:id/apply` | `applyExtractionCandidatesToDraft` |
| `POST /products/merge` | `mergeCanonicalProducts` |
| `POST /products/:id/split` | `splitCanonicalProduct` |
| `GET /analytics/spend` | `querySpendAggregation` |
| `POST /exports` | `requestHouseholdExport` |

任何 handler 不得直接拼接 SQL 或直接修改 receipt status。

## 16. MVP 接口数量和实施顺序

不要一次实现全部接口。建议顺序：

1. A1：`login/logout/me`、创建/读取 household。
2. A2：receipt CRUD、line CRUD、adjustments、reconciliation。
3. A3：validate、confirm、reopen、delete 和对应事务测试。
4. A4：dashboard、spend aggregation、lines drill-down。
5. B：upload intent、image lifecycle、extraction job/candidates、duplicate detection。
6. C：products/aliases、price history、advanced analytics、budget/insights。
7. D：invitation、export、audit、privacy、account deletion。

切片 A 的约 25 个接口是首个可用版本；B–D 只有在前一切片验收通过后进入开发。

## 17. API 完成标准

- 所有业务接口有输入/输出 schema、错误码、权限矩阵和 contract test。
- OpenAPI 文档由 `receiptly-api/contracts` 生成或与其同源，不能手工维护两份真值。
- 所有 repository query 强制 household scope。
- 未确认数据没有任何可进入 analytics/prices/insights 的接口参数或旁路。
- 所有写操作有审计要求、乐观锁或幂等策略。
- 所有列表有界、分页并使用排序白名单。
- Expo 使用由 OpenAPI 生成或封装的 typed client，不能手写一套不一致 DTO。

## 18. 已实现：扫描候选入库与首页商品列表

`POST /receipts/scan` 仍然只是无登录态的 OCR 预览，绝不写入账本。移动端确认候选后，使用以下接口写入家庭草稿：

`POST /households/:householdId/receipts/import-candidate`

- 权限：Bearer 登录态 + 当前家庭 active member。
- 请求包含 `clientDraftId`（UUID）和 scan 接口返回的 `receipt`、`lines`。
- `clientDraftId` 在 `householdId + creatorId` 范围内幂等；断网重试返回同一份草稿，不会重复入账。
- 服务端忽略 scan 预览中的临时 `id`，生成并返回真实数据库 UUID。
- 草稿固定为 `needs_review`，只可在确认接口成功后进入首页。
- 201 代表首次写入；200 代表幂等重放。

```json
{
  "clientDraftId": "b87a6b4a-4d80-49bd-bd59-0c9fd08d92e7",
  "receipt": { "storeName": "PAK'nSAVE Albany", "purchasedOn": "2024-02-24", "declaredTotalCents": 6478, "currency": "NZD" },
  "lines": [{ "productName": "ALMONDS ROASTED SALTED", "quantity": "0.860", "unit": "kg", "linePriceCents": 2537, "included": true, "source": "ai" }]
}
```

`GET /households/:householdId/home/expenses?start=YYYY-MM-DD&end=YYYY-MM-DD&store=&product=&receiptNumber=&limit=20&cursor=`

- 权限：Bearer 登录态 + 当前家庭 active member。
- 仅返回 `confirmed`、未删除、`included` 且有行价的商品行。
- 支持稳定 cursor 翻页；`limit` 默认为 20，最大 100。
- `data.summary` 是当前筛选条件下全部已确认商品行的总额与行数；`data.items` 可直接映射首页列表。
- 不返回图片、OCR prompt、令牌或未确认草稿。

第一版没有“品类”字段、`categories` 接口或分类表；商品按小票原始名称保存。未来如果确实需要分类，会作为独立功能重新设计，而不会影响现有小票与商品行数据。

## 19. 临时 mock 登录态与扫描确认

在真实移动端登录接入前，以下两个路由固定使用 `Receiptly Demo User` 和 `Receiptly Demo Household`，不需要 `Authorization` header：

- `GET /mock/session`：创建（如未存在）并返回固定用户与家庭。
- `POST /receipts/scan/confirm`：接收 `POST /receipts/scan` 响应中的 `data`（即 `{ receipt, lines }`）。扫描响应的 `receipt.id` 被当作幂等 ID；重复确认不会重复入账。

确认接口先校验门店、日期、总额、商品名、行价以及总额平衡；校验通过后，在同一个事务中写入小票、商品行、确认快照和审计记录，并将小票直接标记为 `confirmed`。因此确认成功后可立即通过首页商品列表读取。

临时 mock 仅用于当前本地联调。真实登录接入时，`/mock/*` 和确认路由中的 mock session 必须替换为 Bearer token 身份验证。

## 21. 账号删除与隐私政策

公开隐私政策地址：

`https://www.liushaofei.cn/receiptly/privacy`

App 必须在“我的账号”中提供明显的“删除账号”入口，并在二次确认后调用：

`DELETE /api/receiptly/v1/me`

- 权限：`Authorization: Bearer <accessToken>`。
- 不需要请求体。
- 成功返回 `data.deleted = true`；App 必须清除本地 access token、refresh token 和用户缓存，并返回登录页。
- 删除会撤销全部服务端会话、删除认证身份并匿名化账号。
- 唯一成员 Owner 的家庭及其小票数据随账号级联删除。
- 普通成员删除账号后，其历史共享小票保留在家庭账本，但账号标识被移除。
- Owner 的家庭仍有其他成员时返回 HTTP 409 和 `OWNER_TRANSFER_REQUIRED`。当前 MVP 未提供 Owner 转让时，App 应引导 Owner 先删除其他成员，然后再次删除账号。

成功响应：

```json
{
  "status": 0,
  "message": "success",
  "data": {
    "deleted": true
  }
}
```

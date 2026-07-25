# Receiptly 工程学习记录

更新时间：2026-07-24

本文记录 Receiptly App 与当前服务端接口工程的实际实现，供后续开发、联调和排障使用。产品与验收仍以 App 仓库的 `requirements/requirements-specification.md` 为准，接口字段以 `RECEIPTLY_API_SPEC.md` 为准。

## 1. 工程边界

### 服务端（当前工程）

- 技术栈：Next.js 15 App Router、TypeScript、Drizzle ORM、Neon PostgreSQL。
- HTTP 入口：`app/api/receiptly/v1/**/route.ts`。
- 业务实现：`receiptly-api/`，分为 contracts、application、infrastructure。
- 数据库：通过 `RECEIPTLY_DATABASE_URL` 与个人站数据库逻辑隔离。
- API Route Handler 只负责 HTTP 解析、调用 use case 和响应映射；领域写入与事务位于 application 层。
- 当前扫描/确认联调使用固定的本地 mock user 与 mock household。正式 token 登录能力已经有基础实现，但 App 尚未接入。

### App（`/Users/shaofeiliu/Documents/code/receiptly/apps/mobile`）

- 技术栈：Expo 57、React Native 0.86、React 19、TypeScript strict。
- 应用入口：`apps/mobile/App.tsx`，当前通过本地 state 在首页、添加小票、确认页和个人页之间切换，尚未引入导航库或全局状态库。
- API 客户端集中在 `apps/mobile/api/`。
- 服务地址来自 `EXPO_PUBLIC_API_BASE_URL`，默认 `http://127.0.0.1:3000`。
- 当前没有登录态，扫描和确认请求不携带 access token；服务端相应路由临时使用 mock session。

## 2. 核心产品规则

Receiptly 是家庭私有购物小票账本，不是公开比价平台。

- OCR/AI 结果只能是可编辑候选，不能自动入账。
- 只有 `confirmed` 收据中的 included 行能进入家庭支出和后续分析。
- 总额、有效商品行、门店和日期完整且金额平衡后才能确认。
- 所有正式业务查询必须在服务端按 household membership 隔离。
- 确认与审计写入必须在同一事务内完成，失败时不能留下部分数据。
- OCR 或网络失败时，手动录入必须仍能完成完整流程。

## 3. 当前扫描到确认的数据流

```text
App 选择 JPEG/PNG
  → POST /api/receiptly/v1/receipts/scan (multipart/form-data)
  → OpenRouter 提取候选
  → 返回 needs_review receipt + lines（此时不写数据库）
  → App ReceiptReviewScreen 编辑并在本地核对金额
  → POST /api/receiptly/v1/receipts/scan/confirm (JSON)
  → 服务端再次解析、校验和对账
  → 单个数据库事务写 receipt、lines、confirmation、audit event
  → 返回 confirmed receipt + lines
  → App 回到首页并提示确认成功
```

确认请求结构：

```json
{
  "receipt": {
    "id": "扫描响应生成的 UUID，同时作为幂等 clientDraftId",
    "storeName": "门店",
    "receiptNumber": null,
    "purchasedOn": "2026-07-24",
    "purchasedAtLocal": null,
    "currency": "NZD",
    "declaredTotalCents": 199
  },
  "lines": [
    {
      "id": "客户端行 ID；当前服务端确认写入时不复用",
      "rawText": "GINGER 500G",
      "productName": "GINGER 500G",
      "quantity": "1",
      "unit": "x",
      "unitPriceCents": 199,
      "unitPriceBasis": "item",
      "linePriceCents": 199,
      "source": "ai",
      "included": true
    }
  ]
}
```

金额在两端均使用整数 cents；quantity 使用十进制字符串。服务端不信任 App 的 `canConfirm`，会通过 `reconcileCandidate` 再次校验。

## 4. 2026-07-24 确认接口 500 排障

### 表现

扫描成功，确认页金额平衡；点击“确认”后 App 显示：

```text
未能确认入账
An unexpected error occurred.
```

### 根因

数据库 adapter 原来使用：

```ts
drizzle-orm/neon-http
```

但确认链路会调用 `db.transaction(...)`。Drizzle 的 `neon-http` session 明确不支持该交互式事务，会抛出：

```text
No transactions support in neon-http driver
```

扫描接口只调用 OpenRouter、未写数据库，因此扫描正常；点击确认时首先初始化 mock session，首次触发数据库事务，所以返回 500。数据库只读核查已确认表和新增列均存在，问题不是漏执行迁移。

### 修复

- 数据库 adapter 改为 `drizzle-orm/neon-serverless` + Neon `Pool`，使用 WebSocket 连接以支持事务。
- 复用进程内 Pool/Drizzle 实例，避免每次 repository 调用重复创建连接池。
- 未预期异常继续只向客户端返回通用信息，但服务端记录 request ID、异常类型和异常消息；不记录 token、请求体或商品文本。
- 数据库驱动或连接池实现变化后必须完整重启 Next.js 开发服务；旧进程无法通过热更新可靠替换连接模块，可能只返回无 JSON 的纯文本 `Internal Server Error`。

### 验证要点

1. 合成且金额平衡的确认请求返回 `201` 和 `status: confirmed`。
2. 使用同一 receipt UUID 重试返回 `200`，不创建重复收据。
3. 数据库中同一收据同时存在 receipt、有效 lines、confirmation 和 audit event。
4. 金额不平衡或缺少必填字段仍返回 `422`，不写入任何正式数据。

## 5. 当前实现状态与后续风险

- 扫描候选暂不持久化；App 离开确认页后候选只存在内存中，重启会丢失。
- App 尚未接入 access/refresh token、安全存储和正式 household 选择。
- 当前确认端点是过渡接口，使用扫描 UUID 作为幂等键并一次性原子落库；正式流程可演进为“先保存 needs_review draft，再按 receipt/version 确认”。
- App 首页需要在确认成功后重新拉取数据；当前切回首页会重新挂载，具体刷新行为仍应以 HomeScreen 的请求实现验证。
- `ReceiptCandidateLine.id` 当前不会成为数据库 line ID；如果未来支持逐行草稿保存、冲突合并或离线同步，需要明确 client line ID。
- 服务端已有真实认证、手动收据和部分首页支出接口，但自动化测试覆盖仍不足。确认原子性、幂等、授权和删除重算应优先补集成测试。

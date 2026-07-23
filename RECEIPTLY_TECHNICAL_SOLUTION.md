# receiptly 技术方案

状态：Draft v1  
日期：2026-07-23  
适用范围：`/Users/shaofeiliu/Documents/code/receiptly/apps/mobile` 客户端，以及当前 `feature-receiptly` worktree 内的独立 Receiptly API 模块

## 1. 文档目标

本文把 receiptly 的产品需求转成可实施的技术设计。需求权威来源为相邻仓库中的：

- `/Users/shaofeiliu/Documents/code/receiptly/requirements/requirements-specification.md`
- `/Users/shaofeiliu/Documents/code/receiptly/requirements/project-brief.md`
- `/Users/shaofeiliu/Documents/code/receiptly/requirements/research.md`
- `/Users/shaofeiliu/Documents/code/receiptly/AGENTS.md`

本方案优先保证以下领域不变量：

1. AI/OCR 只产生候选，永远不能自动入账。
2. 只有 `confirmed` 收据中的有效行可以进入支出、价格和洞察。
3. 所有业务查询必须在服务端按 `household_id` 隔离。
4. 确认、重新确认和删除必须原子化，并使所有派生数据同步失效或重建。
5. OCR、AI、上传或网络失败时，手动录入仍是完整路径。

## 2. 当前工程评估

### 2.1 可以复用的基础

- Next.js 15 App Router、React 19、TypeScript strict mode。
- Neon PostgreSQL、Drizzle ORM。
- Vercel 部署与 Analytics。
- SCSS Modules，可继续作为 Web 端样式方案。
- Expo 57 / React Native 0.86 的移动端骨架已经存在，可在 Web MVP 稳定后接入同一 API。

### 2.2 当前工程不能直接复用的部分

现有登录和 API 只适合个人博客演示，不满足 receiptly 的安全要求：

- `verifyUser` 当前未校验密码。
- 登录成功只写入浏览器 `sessionStorage`，服务端没有可信 session。
- `/api/posts` 写接口没有服务端鉴权。
- 默认管理员账号和密码会显示在 UI 中。
- 数据库模块会输出调试日志，并在模块加载时强制要求 `DATABASE_URL`。
- 当前 schema 只有博客 `users/posts`，没有 household 级隔离、状态机、审计或金额模型。
- 没有迁移文件、自动化测试、对象存储、后台任务或错误监测。

因此 receiptly 必须建立独立的认证、授权和领域模块；不能以现有博客登录状态作为家庭数据权限依据。

## 3. 范围与关键假设

### 3.1 本次目标

按需求切片 A–D 交付完整 MVP，但实施顺序必须先完成切片 A：

- 单家庭登录与成员关系。
- 完整手动收据录入。
- 收据确认、总额校验和分类。
- 日期/类别支出查询与下钻。
- 删除后正确重算。
- 核心单元、集成和 E2E 测试。

### 3.2 项目与部署边界

- Expo 客户端保留在独立 Git 仓库 `/Users/shaofeiliu/Documents/code/receiptly/apps/mobile`。
- Receiptly API 在当前 `personalSites` Git 仓库的 `feature-receiptly` worktree 中开发，并随已上线的个人站 Next.js/Vercel 项目部署。
- API 路由统一使用 `/api/receiptly/v1/*`；不复用个人站的 `/api/auth`、`/api/posts` 或浏览器 `sessionStorage` 登录。
- 除 Next.js Route Handler 适配器外，Receiptly API 的 contract、domain、application、database、auth、storage 和 tests 全部放在仓库根目录 `receiptly-api/`。
- Receiptly 使用独立 `RECEIPTLY_DATABASE_URL`、认证密钥、对象存储 namespace/bucket 和日志分类；不能与个人站博客表或管理员 session 混用。
- Mobile 不直接连接数据库，只通过 HTTPS + Bearer token 调用个人站域名下的 Receiptly API。
- 首期面向一个受邀家庭，不开放公共注册。

### 3.3 明确不做

- 不抓取零售商网站或创建公开价格库。
- 不做实时/全市场比价或“原价”“最低价”结论。
- 不做健康评分、营养诊断或个性化饮食建议。
- 不在切片 A 中接入 OCR；先证明手动路径和账本正确性。
- 不引入微前端、GraphQL、全局状态库或独立微服务。

## 4. 总体架构与物理隔离

代码仓库与部署边界：

```text
/Users/shaofeiliu/Documents/code/
├── receiptly/apps/mobile/                    # 独立 Expo 客户端仓库
└── personalSites/                            # 已上线 Next.js 服务仓库
    └── personalSites__worktrees/
        └── feature-receiptly/                # 当前 API 开发 worktree
            ├── app/api/receiptly/v1/         # 极薄 HTTP 入口
            └── receiptly-api/                # Receiptly 接口实现专属目录
```

个人站仓库中的 Receiptly API 目录：

```text
receiptly-api/
├── contracts/                 # DTO、输入校验、错误码、OpenAPI
├── domain/                    # 金额、状态机、价格可比性纯规则
├── application/               # use cases、commands、queries
├── infrastructure/
│   ├── auth/                  # access/refresh token
│   ├── database/              # 独立 schema、migration、repository
│   ├── storage/               # 私有图片与导出文件
│   ├── jobs/                  # OCR、导出、删除后台任务
│   └── observability/         # 日志、trace、metrics
├── shared/                    # money、dates、result 等服务端基础模块
└── tests/                     # unit、integration、contract fixtures
```

`app/api/receiptly/v1/*/route.ts` 只能做 HTTP 解析、认证入口、schema 校验和 response mapping；不得放 SQL、状态机或聚合规则。这样虽然与个人站同仓库、同部署，业务实现仍能保持清晰隔离。

```text
┌──────────────────────┐       ┌──────────────────────┐
│ Personal site Web     │       │ Receiptly Expo App   │
│ unrelated routes     │       │ capture + review     │
└──────────────────────┘       └──────────┬───────────┘
                                         │ HTTPS / JSON
                          ┌───────────────┘
                          ▼
             ┌─────────────────────────┐
             │ Next.js Route Handlers  │
             │ /api/receiptly/v1       │
             │ auth + validation + ACL │
             └───────┬─────────┬───────┘
                     │         │ enqueue
                     ▼         ▼
          ┌────────────────┐  ┌─────────────────────┐
          │ Domain services│  │ Background workflow │
          │ transactions   │  │ OCR / export / retry│
          └───────┬────────┘  └───────┬─────────────┘
                  │                   │
          ┌───────▼────────┐  ┌───────▼─────────────┐
          │ Neon Postgres  │  │ Private object store│
          │ source of truth│  │ receipt/export files│
          └────────────────┘  └─────────────────────┘
```

架构形态选择“同仓库、同部署、强模块隔离”：复用个人站已经上线的 Next.js/Vercel 基础设施，但 Receiptly 使用独立 URL namespace、代码目录、认证、环境变量和数据 schema。客户端与接口是两个 Git 仓库，通过版本化 HTTP 契约协作。

## 5. 接口代码边界

当前 worktree 中建议结构：

```text
feature-receiptly/
├── app/                                      # 现有个人站
│   ├── api/posts/                            # 个人站 API，不允许导入 Receiptly
│   ├── api/auth/                             # 个人站旧认证，不允许复用
│   └── api/receiptly/v1/                     # Receiptly HTTP adapters
│       ├── auth/
│       ├── households/
│       ├── receipts/
│       ├── analytics/
│       ├── products/
│       ├── uploads/
│       └── jobs/
├── receiptly-api/                            # Receiptly 唯一业务实现目录
│   ├── contracts/
│   │   ├── schemas/
│   │   ├── dto/
│   │   ├── errors.ts
│   │   └── openapi.ts
│   ├── domain/
│   │   ├── receipts/
│   │   ├── households/
│   │   ├── products/
│   │   ├── analytics/
│   │   └── money/
│   ├── application/
│   │   ├── commands/
│   │   └── queries/
│   ├── infrastructure/
│   │   ├── auth/
│   │   ├── database/
│   │   │   ├── schema/
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   ├── storage/
│   │   ├── extraction/
│   │   ├── jobs/
│   │   └── observability/
│   └── tests/
├── lib/                                      # 现有个人站 lib，不反向依赖 Receiptly
└── package.json                              # 同一构建，但增加 receiptly scripts/deps
```

依赖方向必须单向：

```text
app/api/receiptly/v1
        → receiptly-api/contracts
        → receiptly-api/application
        → receiptly-api/domain
        ← receiptly-api/infrastructure
```

约束：

- `app/api/receiptly/v1` 不直接访问 Drizzle。
- `receiptly-api/domain` 不导入 Next.js、React、Vercel SDK 或数据库实现。
- 所有 Receiptly repository 必须显式接收服务端解析出的 `actor` 与 `householdId`。
- Receiptly 使用 `RECEIPTLY_DATABASE_URL`，个人站继续使用原 `DATABASE_URL`；不得通过同一个 `db` export 混用。
- 个人站代码不得导入 `receiptly-api/*`，唯一例外是 Receiptly Route Handler。
- Expo 仓库不复制领域规则，只通过 OpenAPI/JSON contract 调用接口；金额和状态校验仍以服务端为真值。

## 6. 认证与授权

### 6.1 认证方案

采用独立于个人站管理员登录的 Receiptly token 认证：

- Expo 使用短期 access token + 可轮换 refresh token；refresh token 只存系统安全存储。
- 数据库保存 refresh token/session 哈希、用户 ID、过期时间和撤销时间。
- API 使用 `Authorization: Bearer <access-token>`，不读取个人站的 `sessionStorage` 或 admin cookie。
- 密码使用成熟认证库提供的安全散列，禁止自行实现 session 或 token 协议。
- 第一阶段关闭公共注册，由管理员创建首个 Owner 或使用一次性邀请链接。

认证实现前通过一个小型 spike 验证 Next.js 15 Route Handler、Expo token rotation 和 Neon adapter；无论选型如何，领域授权都由 Receiptly 自己的 membership service 完成。

### 6.2 授权模型

每次业务请求执行：

```text
authenticate request
→ load active session/user
→ load active household membership
→ verify role + resource ownership
→ execute scoped query/transaction
```

客户端提交的 `householdId` 只代表目标，不代表授权。服务端必须用当前用户的 membership 再验证。

建议权限：

- Owner：家庭、成员、分类、别名合并、预算、导出、全部收据和家庭删除。
- Member：创建/编辑/确认/删除自己的收据，读取家庭确认数据，提交合并建议。
- Member 删除已确认收据时需二次确认，服务端仍验证 creator 或 Owner 权限。

## 7. 数据模型

所有 ID 使用 UUID；金额一律使用整数 cents；业务时间使用 `timestamptz`，购物日期额外保存家庭本地日期。

### 7.1 身份与家庭

| 表 | 核心字段 |
| --- | --- |
| `users` | `id`, `email`, `display_name`, `password_hash`, `created_at`, `disabled_at` |
| `sessions` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at` |
| `households` | `id`, `name`, `timezone`, `currency`, `owner_user_id`, `created_at`, `deleted_at` |
| `household_members` | `household_id`, `user_id`, `role`, `status`, `joined_at` |
| `household_invitations` | `id`, `household_id`, `email`, `role`, `token_hash`, `expires_at`, `accepted_at` |

关键约束：`household_members(household_id, user_id)` 唯一；时区首期固定 `Pacific/Auckland`，但字段仍保留。

### 7.2 收据和候选

| 表 | 核心字段 |
| --- | --- |
| `receipts` | `id`, `household_id`, `creator_id`, `status`, `store_name`, `purchased_on`, `total_cents`, `currency`, `version`, timestamps |
| `receipt_images` | `id`, `household_id`, `receipt_id`, `storage_key`, `sha256`, `mime_type`, `size_bytes`, `deleted_at` |
| `extraction_runs` | `id`, `receipt_id`, `provider`, `model`, `status`, `started_at`, `finished_at`, `error_code` |
| `extraction_candidates` | `id`, `run_id`, `field_path`, `raw_text`, `candidate_json`, `confidence` |
| `receipt_lines` | `id`, `household_id`, `receipt_id`, `position`, `raw_text`, `display_name`, `quantity`, `line_cents`, `category_id`, `canonical_product_id`, `line_status` |
| `receipt_adjustments` | `id`, `receipt_id`, `type`, `amount_cents`, `note` |
| `receipt_confirmations` | `id`, `receipt_id`, `receipt_version`, `confirmed_by`, `confirmed_at`, `totals_snapshot_json` |

候选与正式行分表，避免任何查询误把 OCR 候选当成账本事实。`receipts.version` 使用乐观锁，防止两个成员覆盖同一草稿。

### 7.3 分类、商品与价格

| 表 | 核心字段 |
| --- | --- |
| `spend_categories` | `id`, `household_id`, `name`, `kind`, `is_active`, `sort_order` |
| `canonical_products` | `id`, `household_id`, `display_name`, `status` |
| `product_aliases` | `id`, `household_id`, `raw_text_normalized`, `product_id`, `category_id`, `pack_rule_json`, `is_active` |
| `price_observations` | `id`, `household_id`, `receipt_id`, `receipt_line_id`, `product_id`, `store_name`, `purchased_on`, `paid_cents`, `unit_quantity`, `unit_code`, `unit_price_micros`, `comparability`, `reason_code` |

`price_observations` 是可从已确认行重建的派生表。它通过 `receipt_line_id` 唯一约束避免重复生成。单位价可使用高精度整数或 PostgreSQL `numeric`，但不能使用 JavaScript 浮点数作为真值。

### 7.4 洞察与审计

| 表 | 核心字段 |
| --- | --- |
| `budgets` | `id`, `household_id`, `category_id`, `period`, `limit_cents`, `enabled` |
| `insights` | `id`, `household_id`, `type`, `calculation_version`, `evidence_json`, `window_start`, `window_end`, `dismissed_at` |
| `audit_events` | `id`, `household_id`, `actor_id`, `action`, `object_type`, `object_id`, `change_summary_json`, `created_at` |

审计摘要只记录字段名和必要变化，不保存原图、OCR 全文、密码、token 或支付识别信息。

## 8. 收据状态机与事务

允许状态转换：

```text
draft → processing → needs_review → confirmed
  └──────────────────→ needs_review
confirmed → needs_review → confirmed
draft|processing|needs_review|confirmed → deleted
```

禁止客户端直接提交任意 status。只能调用领域命令：

- `createDraftReceipt`
- `startExtraction`
- `applyExtractionCandidates`
- `saveDraft`
- `confirmReceipt`
- `reopenConfirmedReceipt`
- `deleteReceipt`

### 8.1 确认事务

`confirmReceipt` 在一个数据库事务中完成：

1. `SELECT ... FOR UPDATE` 锁定收据并检查版本、权限和合法状态。
2. 校验头部、行、类别、金额、调整项和总额。
3. 删除该收据旧的价格观测。
4. 只根据当前有效行生成价格观测。
5. 写 confirmation snapshot 和 audit event。
6. 更新收据为 `confirmed` 并递增 version。
7. 写入聚合失效事件或更新时间戳。

任一步失败则全部回滚。

### 8.2 编辑和删除

- 修改已确认收据的金额、类别、商品、规格或可比性时，先在事务中撤销派生观测并改为 `needs_review`。
- 删除使用业务软删除；事务内撤销价格观测并使聚合失效。
- 原图删除和账本删除分开处理；对象存储删除失败时记录可重试任务，UI 显示真实完成状态。

## 9. API 设计

统一前缀 `/api/receiptly/v1`，使用 JSON；输入和输出均通过 schema 校验。错误结构：

```json
{
  "error": {
    "code": "RECEIPT_TOTAL_MISMATCH",
    "message": "Receipt total does not match confirmed lines.",
    "fieldErrors": {},
    "requestId": "..."
  }
}
```

核心接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/me` | 当前用户、家庭和角色 |
| `POST` | `/receipts` | 创建手动/上传草稿 |
| `GET/PATCH` | `/receipts/:id` | 读取或保存草稿，携带 version |
| `POST` | `/receipts/:id/confirm` | 原子确认 |
| `POST` | `/receipts/:id/reopen` | 已确认内容回到复核 |
| `DELETE` | `/receipts/:id` | 删除并撤销派生数据 |
| `POST` | `/receipts/:id/upload-intent` | 获取受控上传凭据 |
| `POST` | `/receipts/:id/extract` | 创建后台 OCR 任务 |
| `GET` | `/analytics/spend` | 日期/门店/类别/成员筛选和单主维度聚合 |
| `GET` | `/analytics/lines` | 汇总下钻 |
| `GET` | `/products` | 商品、别名和原文搜索 |
| `GET` | `/products/:id/prices` | 家庭历史购买价和可比性 |

写接口要求 Bearer token 校验、请求体上限、速率限制和幂等键。上传、确认、邀请和导出尤其需要限流。

## 10. Expo 客户端协作方案

### 10.1 API client 和状态

- Expo 通过一个集中 `apiClient` 调用 `/api/receiptly/v1`，统一处理 base URL、Bearer token、refresh、request ID 和错误映射。
- access token 只放内存，refresh token 放系统安全存储；不能使用普通 AsyncStorage 保存长期凭据。
- 日期、门店、类别和主分组作为 screen navigation params 与 API query 传递。
- 表单草稿放在 screen/feature 局部状态；切片 B 增加本地持久化离线草稿和同步队列。
- 不在客户端复制确认、金额或权限真值；本地校验只用于即时提示，服务端校验决定结果。
- mutation 成功后只失效对应 receipt、analytics 或 product query。

### 10.2 App 导航

Expo 使用独立移动导航和错误边界，建议底部导航：

- Home
- Receipts
- Analytics
- Products
- Settings

“Add receipt”始终是主操作。

### 10.3 手动录入和确认页

- Header：门店、日期、币种、总额。
- Lines：逐行名称、数量、规格、金额、类别和状态。
- Reconciliation：实时展示行合计、调整项、收据总额和差额。
- 保存草稿与确认是两个不同操作。
- 确认前展示错误摘要，并把焦点移动到第一个错误字段。
- 长小票使用分段保存；切片 B 在真实数据证明需要后加入虚拟列表。

### 10.4 可访问性

- 所有输入有可见 label、accessibilityLabel 和关联错误文本。
- 主要点击目标不小于约 44×44 points。
- 状态不只通过颜色表达。
- 图表必须有同数据的可访问表格。
- Modal 管理焦点/读屏顺序和返回行为；删除需要二次确认。

## 11. OCR、上传与后台任务（切片 B）

### 11.1 上传

流程：

```text
创建 receipt draft
→ API 返回短期上传凭据
→ 客户端直传私有对象存储
→ 完成回调校验 owner、MIME、大小、hash
→ enqueue extraction
→ receipt: processing
```

支持 JPG/PNG/HEIC/PDF；服务端进行真实 MIME 检测，不只信任扩展名。私有文件只能通过短期签名 URL 访问。

### 11.2 OCR adapter

定义供应商无关接口：

```ts
type ReceiptExtractor = {
  extract(input: PrivateReceiptAsset): Promise<ExtractionResult>;
};
```

`ExtractionResult` 只能写入 `extraction_candidates`。后台任务完成后将状态改为 `needs_review`，绝不调用确认逻辑。

### 11.3 失败策略

- 可重试错误：指数退避，限制最大次数。
- 永久错误：标记 `needs_review` 并显示手动入口。
- 幂等键：`receipt_id + image_hash + extractor_version`。
- 用户取消不会删除已编辑草稿。
- 日志只记录 provider、耗时、状态和错误码，不记录完整 OCR 文本。

## 12. 聚合、价格与可比性

### 12.1 统计真值

所有统计查询都必须包含：

```sql
receipts.status = 'confirmed'
AND receipts.deleted_at IS NULL
AND receipt_lines.line_status = 'included'
AND receipts.household_id = :authorized_household_id
```

切片 A/C 数据量较小时直接基于规范化表查询，避免过早维护复杂汇总表。出现可测量的查询瓶颈后，再加入按日/类别/商品汇总表；汇总必须可从源数据完全重建。

### 12.2 金额与日期

- 所有金额计算使用 cents。
- 日期范围采用 `[start, endExclusive)`。
- 根据 household timezone 将本地日期转换为查询边界。
- `median` 使用 PostgreSQL percentile 函数计算，返回样本数和窗口。

### 12.3 单位价和可比性

规范单位首期只支持：`g/kg`, `ml/L`, `item`。先归一化为基础单位，再计算单位价。以下默认不可比：

- 规格或数量未知。
- 不同维度单位。
- multi-buy、coupon、refund、free item 或无法分配的整单折扣。
- 商品身份仍有歧义。

UI 必须同时显示 `comparability` 和 `reason_code`，不得只隐藏异常样本。

## 13. 隐私、安全与可观察性

### 13.1 安全基线

- 严格服务端鉴权和 household scope。
- 短期 access token、refresh token rotation、防暴力登录和请求限流。
- 对文件类型、大小、hash 和解码结果做服务端验证。
- 原图、导出和 invitation token 使用短期受控链接；数据库只存 storage key/token hash。
- 敏感配置只通过环境 Secret 注入。
- 日志脱敏：禁止密码、token、原图 URL、OCR 全文和商品全文。
- 现有 `/api/init` 和博客写接口必须与 receiptly 权限彻底隔离；上线前也应修复其公开写入风险。

### 13.2 技术事件

只记录不包含商品内容的事件：

- receipt_draft_created
- manual_receipt_confirmed
- extraction_started/succeeded/failed
- confirmation_blocked_total_mismatch
- receipt_deleted
- analytics_query_failed

指标：上传失败率、OCR 失败率、确认完成率、平均确认时长、聚合错误率、Web Vitals。日志包含 request ID、user ID hash、household ID hash 和错误码，不包含业务文本。

## 14. 测试策略

### 14.1 单元测试

- cents 金额与格式化。
- 行合计、调整项与容差。
- 单位归一化和单位价。
- 可比性 reason code。
- household timezone 日期窗口。
- 类别比例、median 和排名。
- 状态机允许/禁止转换。

### 14.2 集成测试

使用隔离 PostgreSQL 测试库，覆盖：

- 跨家庭 IDOR 被拒绝且不泄漏对象存在性。
- Owner/Member 权限矩阵。
- 确认事务任一步失败时完全回滚。
- 重复确认不会产生重复 price observation。
- confirmed 编辑后退出正式统计。
- 删除后金额、下钻和价格观测同步消失。
- 乐观锁冲突返回 409。

### 14.3 E2E

用 Playwright 覆盖：

1. 登录 → 手动录入 → 修正总额 → 确认 → 首页金额更新。
2. 保存草稿 → 重新进入 → 编辑内容仍存在。
3. 按日期/类别筛选 → 汇总 → 下钻。
4. OCR 失败 → 无刷新切换手动录入。
5. 删除已确认收据 → 所有派生视图移除。
6. 无权限、空态、筛选无结果、移动视口和键盘操作。

测试数据只使用合成或明确授权并脱敏的小票。

## 15. CI/CD 与环境

新增标准脚本：

```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:integration": "...",
  "test:e2e": "playwright test",
  "db:migrate": "drizzle-kit migrate"
}
```

流水线顺序：

```text
npm ci
→ lint
→ typecheck
→ unit tests
→ integration tests
→ build
→ E2E against preview
→ production deployment approval
```

环境分为 local、preview、production；三者使用不同数据库、对象存储空间和认证密钥。迁移采取向后兼容的 expand/migrate/contract，禁止在同一次发布中直接删除仍被旧代码读取的列。

## 16. 分阶段实施

### Phase 0：工程基线（1–2 天）

- 在当前 worktree 创建 `receiptly-api/`，并建立 contract/domain/application/infrastructure 边界。
- 在 `app/api/receiptly/v1/` 创建极薄 Route Handler adapters。
- 为 Expo 客户端确定 API base URL、Bearer token 和 OpenAPI contract 流程。
- 引入迁移、环境校验、测试框架和 CI quality gate。
- 删除数据库敏感调试日志。
- 完成认证方案 spike 和 ADR。

验收：lint、typecheck、unit test、build 可在 CI 重复运行；Receiptly 与个人站同仓库部署但代码、认证、数据库和 URL namespace 隔离。

### Phase A：可靠手动账本（第 1–2 周）

- 用户、session、household、membership。
- 默认类别 seed。
- 手动收据草稿、行编辑、调整项、总额校验。
- 原子确认、重新复核、删除和审计。
- 首页本月金额、日期/类别分析和下钻。
- 核心单元/集成/E2E。

验收：完全关闭 OCR 仍可独立录入至少 10 张收据；未确认数据无法进入任何统计。

### Phase B：上传与候选（第 3 周）

- 私有对象存储、受控上传和文件校验。
- 后台任务与 OCR adapter。
- 候选字段、置信度、失败/取消/重试。
- 重复 hash 提示、别名规则、离线草稿。

验收：OCR 成功也必须逐行确认；OCR 失败无需刷新即可走完整手动流程。

### Phase C：家庭历史变得有用（第 4 周）

- Canonical product、alias 合并/拆分和审计。
- 商品搜索、跨店家庭历史价、单位价和可比性。
- 通用聚合视图、URL 筛选、预算和确定性洞察。

验收：AC-04～AC-07、AC-13、AC-14 通过；所有价格文案明确是家庭历史数据。

### Phase D：交付质量（第 5 周）

- 邀请、CSV、删除家庭流程。
- 可访问性、移动体验、长收据性能。
- Expo 客户端接入稳定 API。
- 错误监测、隐私说明、备份/删除说明。
- 小规模家庭试用与指标复盘。

验收：需求定义中的 AC-01～AC-14 全部自动化或有明确人工验收记录，无 P0/P1 权限、金额和隐私问题。

## 17. 技术决策与取舍

| 决策 | 选择 | 原因 | 代价 |
| --- | --- | --- | --- |
| 仓库形态 | Expo 独立仓库；API 位于 personalSites 的 `receiptly-api/` | 客户端独立演进，同时复用已上线服务 | API 发布受个人站部署节奏影响 |
| API | `/api/receiptly/v1` REST Route Handlers + 独立 service module | Expo 易使用，且不污染个人站 API | 需维护 DTO、版本和兼容窗口 |
| 客户端契约 | OpenAPI/JSON contract | 跨仓库可验证，不共享源码 | contract 变更需生成并同步 client |
| 客户端状态 | Expo local state + secure token + offline draft | 满足移动拍摄和断网草稿 | 需处理同步冲突 |
| 聚合 | 首期按源表查询 | 保持可追溯并减少一致性风险 | 数据量增长后需汇总表 |
| OCR | 异步 adapter | 不阻塞请求且可替换供应商 | 增加任务系统和状态 UI |
| 移动端 | Web MVP 后接入 Expo | 先稳定领域/API，减少双端返工 | 原生拍摄体验延后 |

## 18. 风险和缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 现有博客鉴权不安全 | 同域部署可能扩大风险 | Receiptly 独立 Bearer auth/数据库；路由不复用旧 auth；个人站写 API需单独加固 |
| OCR 缩写和折扣解析错误 | 错账、错误价格 | 候选分表、强制确认、调整项和不可比 reason |
| Vercel 请求生命周期不适合长 OCR | 超时或重复任务 | 外部持久化工作流、幂等键、重试和状态查询 |
| 跨家庭查询遗漏 scope | 严重隐私事件 | 集中 authorization/data-access API、IDOR 集成测试、代码评审清单 |
| 跨仓库契约漂移 | Expo 与 API 不兼容 | OpenAPI contract test、版本前缀和向后兼容窗口 |
| 过早复杂聚合 | 一致性 bug | 源表查询优先，性能达到阈值后才引入可重建汇总 |
| 用户不愿逐行确认 | 产品留存不足 | 首周测量确认时间和修正字段数，再投资 OCR/别名优化 |

## 19. 首个实施任务清单

建议立即按以下顺序开始，不先做 OCR：

1. 在当前 worktree 创建 `receiptly-api/` 与 `app/api/receiptly/v1/` adapters。
2. 选择并验证 Expo Bearer token/refresh token 方案，完全隔离个人站 `sessionStorage` 登录。
3. 创建身份、家庭、分类、收据、行、调整项、确认和审计迁移。
4. 实现 authorization guard 和跨家庭拒绝测试。
5. 实现 `createDraft/saveDraft/confirm/delete` 领域服务与状态机测试。
6. 发布 OpenAPI contract，并在独立 Expo 仓库生成/封装 typed client。
7. 在 Expo 实现手动录入、确认、本月首页、基础分析和下钻。
8. 建立完整 CI gate 后，再进入上传/OCR 切片。

## 20. 完成标准

技术方案落地后的 MVP 必须同时满足：

- 任意未确认、冲突或已删除数据都无法进入统计、价格或洞察。
- 每个金额都能下钻到确认收据和行项目。
- 跨家庭 URL/API 访问被服务端拒绝。
- 总额不符不能静默确认。
- 修改/删除确认收据后，所有派生数据一致更新。
- AI/网络失败时手动录入始终可完成。
- 原图和导出私有，日志无业务敏感文本。
- 所有价格结论只描述本家庭历史购买数据。

# 星幕票务 — 后端接口对接文档

> 本文档由前端代码自动梳理，后端照此实现即可对接。
> 对接完成后，前端只需改 `.env.development` 中 `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=后端地址` 即可切换。

---

## 一、通用约定（必须遵守）

### 1.1 统一响应格式

**所有接口**（无论成功失败）都返回以下 JSON 结构：

```jsonc
// 成功
{ "code": 0, "message": "success", "data": {...}, "traceId": "abc123" }

// 失败
{ "code": 40201, "message": "演出不存在或已下架", "data": null, "traceId": "abc123" }
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | **0 = 成功**，非 0 = 业务错误码 |
| message | string | 提示信息（成功时 "success"，失败时具体原因） |
| data | any | 业务数据，失败时为 null |
| traceId | string | 链路追踪 ID，用于排查问题 |

### 1.2 认证方式

```
Authorization: Bearer <token>
```

- 登录成功后返回 JWT token
- 除 `/auth/login`、`/auth/register` 外，所有接口都需要携带 token
- token 过期返回 HTTP 401，前端会自动跳转登录页

### 1.3 字段命名

- 统一用 **camelCase**（驼峰），如 `remainingQuantity`、`orderNo`
- 不用 snake_case（如 ~~remaining_quantity~~）

### 1.4 金额单位

- 统一用 **分**（整数），如 288000 表示 2880 元
- 不用元（如 ~~2880.00~~）

### 1.5 日期格式

- 统一 `yyyy-MM-dd HH:mm:ss`，如 `2026-10-15 19:30:00`

### 1.6 分页

**请求参数**（query string）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 是 | 页码，从 1 开始 |
| size | number | 是 | 每页条数 |

**响应格式**：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "records": [...],
    "total": 100,
    "page": 1,
    "size": 10
  }
}
```

### 1.7 幂等性

下单和支付接口需要支持幂等：

```
Idempotency-Key: <前端生成的 UUID>
```

- 相同的 Idempotency-Key 重复请求，后端返回上次的结果
- 防止用户重复提交导致重复下单/扣款

---

## 二、枚举定义

### 2.1 演出状态 EventStatus

| 值 | 说明 |
|------|------|
| DRAFT | 草稿（未上架） |
| ON_SALE | 在售 |
| SOLD_OUT | 售罄 |
| END | 已结束 |

### 2.2 场次状态 SessionStatus

| 值 | 说明 |
|------|------|
| NOT_STARTED | 未开售 |
| ON_SALE | 在售 |
| SOLD_OUT | 售罄 |
| ENDED | 已结束 |

### 2.3 座位状态 SeatStatus

| 值 | 说明 |
|------|------|
| AVAILABLE | 可售 |
| LOCKED | 已锁定（用户选座后、付款前的临时锁定） |
| SOLD | 已售（付款成功后） |
| DISABLED | 禁用（管理员手动关闭） |

### 2.4 订单状态 OrderStatus

| 值 | 说明 |
|------|------|
| UNPAID | 待支付 |
| PAID | 已支付 |
| CANCELED | 已取消 |
| REFUNDING | 退款中 |
| REFUNDED | 已退款 |
| FINISHED | 已完成 |

**状态流转规则**：

```
UNPAID → PAID（支付成功）
UNPAID → CANCELED（用户取消/超时关单）
PAID → REFUNDING（申请退款）
REFUNDING → REFUNDED（退款成功）
REFUNDING → PAID（退款驳回，恢复已支付）
PAID → FINISHED（观演结束）
```

### 2.5 锁座失败原因 SeatLockFailReason

| 值 | 说明 |
|------|------|
| SEAT_TAKEN | 座位已被他人锁定 |
| NOT_AVAILABLE | 座位不可售 |
| LIMIT_EXCEEDED | 超出限购数量 |

---

## 三、数据结构定义

### 3.1 用户 UserInfo

```jsonc
{
  "id": 1,                // 用户ID
  "username": "admin",    // 登录名
  "nickname": "管理员",   // 昵称
  "role": "ADMIN",        // 角色：USER 普通用户 / ADMIN 管理员
  "phone": "13800000001", // 手机号（选填）
  "avatar": ""            // 头像URL（选填）
}
```

### 3.2 演出 EventItem

```jsonc
{
  "id": 1,
  "title": "周杰伦「嘉年华」世界巡回演唱会·北京站",
  "poster": "https://xxx.com/poster.jpg",  // 海报URL（选填）
  "venue": "国家体育场（鸟巢）",            // 场馆
  "city": "北京",                          // 城市
  "category": "演唱会",                    // 分类
  "status": "ON_SALE",                     // 演出状态
  "showTime": "2026-10-15 19:30:00",       // 演出时间（选填）
  "saleStartTime": "2026-09-01 10:00:00",  // 开售时间（选填）
  "saleEndTime": "2026-10-15 18:00:00",    // 截止时间（选填）
  "minPrice": 88000,                       // 最低价，分（选填）
  "maxPrice": 288000,                      // 最高价，分（选填）
  "description": "演唱会描述..."           // 描述（选填）
}
```

### 3.3 场次 SessionItem

```jsonc
{
  "id": 101,
  "eventId": 1,                            // 所属演出ID
  "showTime": "2026-10-15 19:30:00",       // 演出时间
  "venue": "国家体育场（鸟巢）",            // 场馆
  "status": "ON_SALE",                     // 场次状态
  "saleStartTime": "2026-09-01 10:00:00",  // 开售时间
  "saleEndTime": "2026-10-15 18:00:00",    // 截止时间
  "remainingCount": 500,                   // 剩余座位总数（选填）
  "minPrice": 88000                        // 最低票价，分（选填）
}
```

### 3.4 票档 TicketCategory

```jsonc
{
  "id": 1001,
  "sessionId": 101,          // 所属场次ID
  "name": "内场VIP",         // 票档名称
  "price": 288000,           // 票价，分
  "color": "#E8463A",        // 颜色（选填，前端展示用）
  "totalQuantity": 200,      // 总票数
  "soldQuantity": 50,        // 已售数
  "remainingQuantity": 150,  // 剩余数
  "limitPerUser": 4,         // 每人限购
  "description": "内场前排VIP区"  // 描述（选填）
}
```

### 3.5 座位 Seat

```jsonc
{
  "id": 101001,
  "row": "A",              // 排号（字母）
  "col": 1,                // 列号（数字）
  "area": "内场VIP",       // 区域名（与票档name一致）
  "status": "AVAILABLE",   // 座位状态
  "lockUserId": 2,         // 锁定者用户ID（仅LOCKED时有值）
  "lockExpireAt": "2026-09-24 20:00:00",  // 锁定过期时间（仅LOCKED时有值）
  "categoryId": 1001,      // 所属票档ID
  "price": 288000          // 票价，分
}
```

### 3.6 座位区域 SeatArea（座位图按区域分组）

```jsonc
{
  "area": "内场VIP",       // 区域名
  "seats": [Seat, ...],   // 该区域所有座位
  "rows": ["A", "B", "C"]  // 该区域所有排号
}
```

### 3.7 订单项 OrderItem（下单用）

```jsonc
{
  "ticketCategoryId": 1001,  // 票档ID
  "quantity": 2,             // 购买数量
  "seatIds": [101001, 101002]  // 座位ID列表（仅选座订单SEAT类型有值）
}
```

### 3.8 订单项详情 OrderItemWithDetail（订单列表/详情用）

```jsonc
{
  "ticketCategoryId": 1001,
  "categoryName": "内场VIP",      // 票档名
  "price": 288000,               // 单价，分
  "quantity": 2,                 // 数量
  "seatIds": [101001, 101002],   // 座位ID（选填）
  "seatLabels": ["A1", "A2"]     // 座位标签（选填，如"A1"）
}
```

### 3.9 订单 OrderListItem / OrderDetail

```jsonc
// 列表项
{
  "orderNo": "ST202609230001",         // 订单号
  "sessionId": 101,                    // 场次ID
  "eventTitle": "周杰伦...",           // 演出标题
  "showTime": "2026-10-15 19:30:00",   // 演出时间
  "venue": "国家体育场（鸟巢）",        // 场馆
  "payAmount": 576000,                 // 支付金额，分
  "status": "UNPAID",                  // 订单状态
  "expireTime": "2026-10-15 19:20:00", // 超时时间（仅UNPAID有值）
  "createTime": "2026-09-23 19:45:00", // 创建时间
  "orderType": "SEAT",                 // 订单类型：NORMAL 普通 / SEAT 选座
  "items": [OrderItemWithDetail, ...], // 订单项
  "username": "user"                   // 下单用户名（管理端列表展示/筛选，C端可省）
}

// 详情（在列表项基础上增加）
{
  ...OrderListItem,
  "attendees": [                       // 观演人
    { "name": "张三", "phone": "138xxx", "idCard": "110xxx" }
  ],
  "payTime": "2026-09-23 19:50:00",    // 支付时间（选填）
  "payNo": "PAY123456"                 // 支付流水号（选填）
}
```

### 3.10 预约 ReservationItem

```jsonc
{
  "id": 1,
  "sessionId": 103,
  "categoryId": 1031,
  "eventTitle": "周杰伦...",
  "showTime": "2026-10-17 19:30:00",
  "categoryName": "内场VIP",
  "status": "PENDING",      // PENDING 待通知 / NOTIFIED 已通知 / CANCELED 已取消
  "createTime": "2026-09-23 10:00:00"
}
```

---

## 四、接口清单

> 所有路径前缀 `/api`，由前端 baseURL 统一拼接。

### 4.1 认证模块

#### POST /auth/login — 登录

```jsonc
// 请求
{ "username": "admin", "password": "123456" }

// 响应 data
{
  "token": "xxx.jwt.token",
  "expiresIn": 7200,        // token 有效期，秒
  "user": UserInfo
}
```

#### POST /auth/register — 注册

```jsonc
// 请求
{ "username": "newuser", "password": "Abc12345", "nickname": "新用户", "phone": "138xxx" }

// 响应 data（同登录）
{ "token": "...", "expiresIn": 7200, "user": UserInfo }
```

**校验规则（前端 + 后端均需校验）**：
- username：4-20 位，仅支持字母、数字、下划线
- password：8-32 位，必须同时包含字母和数字
- nickname/phone：选填

#### GET /auth/profile — 获取当前用户信息

```jsonc
// 响应 data
UserInfo
```

#### PUT /auth/profile — 更新个人资料

```jsonc
// 请求（部分字段）
{ "nickname": "新昵称", "phone": "139xxx" }

// 响应 data
UserInfo
```

#### POST /auth/logout — 退出登录

```jsonc
// 响应 data
null
```

---

### 4.2 演出模块（用户端，只读）

#### GET /events — 演出列表（分页）

```jsonc
// 请求 query
{ "page": 1, "size": 10, "keyword": "周杰伦", "city": "北京", "category": "演唱会", "status": "ON_SALE",
  "minPrice": 88000, "maxPrice": 288000, "sort": "price_asc" }
// keyword/city/category/status/minPrice/maxPrice/sort 均为选填
// minPrice/maxPrice 单位：分（整数），按演出价格区间重叠筛选
// sort 取值：heat_desc（热度优先，默认）/ time_desc（最新优先）/ price_asc（价格升序）/ price_desc（价格降序）

// 响应 data
PageResult<EventItem>
```

#### GET /events/:id — 演出详情

```jsonc
// 响应 data
EventItem
```

#### GET /events/:eventId/sessions — 某演出的场次列表

```jsonc
// 响应 data（数组，不分页）
SessionItem[]
```

---

### 4.3 场次模块

#### GET /sessions/:id — 场次详情

```jsonc
// 响应 data
SessionItem
```

#### GET /sessions/:id/categories — 场次的票档列表

```jsonc
// 响应 data（数组）
TicketCategory[]
```

---

### 4.4 座位模块

#### GET /sessions/:id/seats — 座位图（按区域分组）

```jsonc
// 响应 data（数组）
SeatArea[]
```

#### GET /sessions/:id/seats/mine — 我的锁定座位（页面刷新恢复用）

```jsonc
// 响应 data（数组）
Seat[]
// 返回当前用户在该场次锁定的座位
```

#### POST /seats/lock — 批量锁座

```jsonc
// 请求（Header 需带 Idempotency-Key）
{ "sessionId": 101, "seatIds": [101001, 101002] }

// 响应 data
{
  "expireAt": "2026-09-24 20:00:00",  // 锁定过期时间（15分钟后）
  "results": [
    { "seatId": 101001, "success": true },
    { "seatId": 101002, "success": false, "failReason": "SEAT_TAKEN" }
  ]
}
```

**后端逻辑**：
- 将 AVAILABLE 座位改为 LOCKED，设置 lockUserId 和 lockExpireAt
- 锁定有效期 15 分钟，超时后自动释放回 AVAILABLE
- 非 AVAILABLE 状态的座位返回失败

#### DELETE /seats/lock — 释放座位

```jsonc
// 请求 body
{ "sessionId": 101, "seatIds": [101001, 101002] }

// 响应 data
null
```

**后端逻辑**：将 LOCKED 座位改回 AVAILABLE，清除 lockUserId 和 lockExpireAt

---

### 4.5 订单模块

#### POST /orders — 创建订单

```jsonc
// 请求（Header 必带 Idempotency-Key）
{
  "sessionId": 101,
  "orderType": "SEAT",        // NORMAL 普通购票 / SEAT 选座购票
  "items": [
    { "ticketCategoryId": 1001, "quantity": 2, "seatIds": [101001, 101002] },
    { "ticketCategoryId": 1004, "quantity": 1, "seatIds": [101010] }
  ],
  "attendees": [
    { "name": "张三", "phone": "138xxx", "idCard": "110xxx" },
    { "name": "李四", "phone": "139xxx", "idCard": "120xxx" },
    { "name": "王五", "phone": "137xxx", "idCard": "130xxx" }
  ]
}
// attendees 数量必须等于所有 items 的 quantity 总和

// 响应 data
{
  "orderNo": "ST202609240001",
  "payAmount": 704000,         // 应付总额，分（后端计算，前端不传价格）
  "status": "UNPAID",
  "expireTime": "2026-09-24 20:15:00"  // 超时关单时间（15分钟后）
}
```

**后端逻辑**：
- 扣减票档库存：remainingQuantity -= quantity，soldQuantity += quantity
- SEAT 类型：将座位标记为 LOCKED（已通过锁座接口锁定，此处确认归属）
- 生成订单号、计算应付金额（= 各票档单价 × 数量 之和）
- 设置 15 分钟超时时间

#### GET /orders — 我的订单列表（分页）

```jsonc
// 请求 query
{ "page": 1, "size": 10, "status": "UNPAID" }  // status 选填

// 响应 data
PageResult<OrderListItem>
```

#### GET /orders/:orderNo — 订单详情

```jsonc
// 响应 data
OrderDetail
```

#### POST /orders/:orderNo/cancel — 取消订单（仅 UNPAID）

```jsonc
// 响应 data
null
```

**后端逻辑**：
- 回补票档库存：remainingQuantity += quantity，soldQuantity -= quantity
- 释放座位：LOCKED → AVAILABLE
- 订单状态改为 CANCELED

#### POST /orders/:orderNo/refund — 申请退款（仅 PAID）

```jsonc
// 响应 data
null
```

**后端逻辑**：订单状态 PAID → REFUNDING

---

### 4.6 支付模块

#### POST /pay/mock/notify — 模拟支付回调

```jsonc
// 请求（Header 必带 Idempotency-Key）
{ "orderNo": "ST202609240001", "amount": 704000, "payNo": "uuid-xxx" }

// 响应 data
{
  "payNo": "PAY123456",
  "orderStatus": "PAID",
  "duplicated": false    // true=重复支付（返回上次结果）
}
```

**后端逻辑**：
- 订单状态 UNPAID → PAID
- SEAT 类型订单：将座位 LOCKED → SOLD
- 记录 payTime 和 payNo
- 幂等：相同 payNo 重复请求返回 duplicated=true

---

### 4.7 预约模块

#### POST /reservations — 创建预约

```jsonc
// 请求
{ "sessionId": 103, "categoryId": 1031 }

// 响应 data
ReservationItem
```

**后端逻辑**：同用户同场次同票档只能预约一次（重复返回错误）

#### GET /reservations — 我的预约列表（分页）

```jsonc
// 请求 query
{ "page": 1, "size": 10 }

// 响应 data
PageResult<ReservationItem>
```

#### DELETE /reservations/:id — 取消预约

```jsonc
// 响应 data
null
```

---

### 4.8 管理端 — 演出管理（需 ADMIN 权限）

#### GET /admin/events — 演出列表（分页，同用户端）

#### GET /admin/events/:id — 演出详情

#### POST /admin/events — 创建演出

```jsonc
// 请求（Partial<EventItem>）
{ "title": "...", "venue": "...", "city": "...", "category": "...", "status": "DRAFT", ... }
// 响应 data: EventItem
```

#### PUT /admin/events/:id — 更新演出

```jsonc
// 请求（Partial<EventItem>，传哪些改哪些）
{ "title": "新标题", "status": "ON_SALE" }
// 响应 data: EventItem
```

**后端联动**：如果 status 变化，需级联更新该演出下所有场次状态：
- ON_SALE → 场次 ON_SALE
- SOLD_OUT → 场次 SOLD_OUT
- DRAFT → 场次 NOT_STARTED
- END → 场次 ENDED

#### PUT /admin/events/:id/status — 仅改状态

```jsonc
// 请求
{ "status": "ON_SALE" }
// 响应 data: EventItem
```

#### DELETE /admin/events/:id — 删除演出

```jsonc
// 响应 data: null
```

**后端联动**：级联删除该演出下的所有场次、票档、座位数据

---

### 4.9 管理端 — 场次管理

#### GET /admin/events/:eventId/sessions — 某演出的场次列表

#### POST /admin/events/:eventId/sessions — 创建场次

```jsonc
// 请求
{ "showTime": "2026-10-15 19:30:00", "venue": "...", "status": "NOT_STARTED", "saleStartTime": "...", "saleEndTime": "..." }
// 响应 data: SessionItem
```

#### PUT /admin/sessions/:id — 更新场次

```jsonc
// 请求（Partial<SessionItem>）
{ "status": "ON_SALE" }
// 响应 data: SessionItem
```

**后端联动**：
- 场次状态变化 → 联动演出状态（如所有场次售罄 → 演出售罄）
- 场次 → SOLD_OUT → 票档 remainingQuantity 清零
- 场次 → ON_SALE → 票档 remainingQuantity 回算

#### DELETE /admin/sessions/:id — 删除场次

```jsonc
// 响应 data: null
```

**后端联动**：级联删除该场次的票档、座位，并刷新演出状态

---

### 4.10 管理端 — 票档管理

#### GET /admin/sessions/:sessionId/categories — 票档列表

#### POST /admin/sessions/:sessionId/categories — 创建票档

```jsonc
// 请求
{ "name": "内场VIP", "price": 288000, "color": "#E8463A", "totalQuantity": 200, "limitPerUser": 4, "description": "..." }
// 响应 data: TicketItem
```

**后端联动**：
- 自动生成座位（或由后端决定是否自动）
- 刷新场次 remainingCount = 所有票档 remainingQuantity 之和
- 如果场次之前 SOLD_OUT，新增票档后场次可能恢复 ON_SALE

#### PUT /admin/categories/:id — 更新票档

```jsonc
// 请求（Partial<TicketCategory>）
{ "price": 300000, "totalQuantity": 250 }
// 响应 data: TicketCategory
```

**后端联动**：
- totalQuantity 变化 → 重算 remainingQuantity = totalQuantity - soldQuantity
- price 变化 → 同步更新座位价格
- name 变化 → 同步更新座位 area 名
- 刷新场次 remainingCount 和状态

#### DELETE /admin/categories/:id — 删除票档

```jsonc
// 响应 data: null
```

**后端联动**：移除该票档的座位，刷新场次 remainingCount

---

### 4.11 管理端 — 座位管理

#### GET /admin/sessions/:sessionId/seats — 座位列表

```jsonc
// 响应 data（扁平数组）
Seat[]
```

#### POST /admin/sessions/:sessionId/seats/batch — 批量生成座位

```jsonc
// 请求
{ "area": "内场VIP", "rows": ["A", "B", "C"], "cols": 12, "categoryId": 1001, "status": "AVAILABLE" }

// 响应 data
Seat[]
```

**后端逻辑**：
- categoryId 必填且必须对应真实票档
- 座位的 price 从票档自动读取，不由前端传
- area 名通常与票档 name 一致

#### PUT /admin/seats/:id — 修改单个座位

```jsonc
// 请求（Partial<Seat>）
{ "status": "SOLD" }
// 响应 data: Seat
```

**后端联动**：
- 改为 SOLD → 票档 soldQuantity +1，remainingQuantity -1
- 改回 AVAILABLE → 票档 soldQuantity -1，remainingQuantity +1
- 刷新场次 remainingCount

---

### 4.12 管理端 — 订单管理

#### GET /admin/orders — 订单列表（分页）

```jsonc
// 请求 query
{ "page": 1, "size": 10, "status": "UNPAID",
  "orderNo": "ST2026", "username": "user",
  "startTime": "2026-09-01 00:00:00", "endTime": "2026-09-30 23:59:59" }
// status/orderNo/username/startTime/endTime 均为选填
// orderNo/username 支持模糊匹配（includes）
// startTime/endTime 闭区间，按 createTime 筛选
// 响应 data: PageResult<OrderListItem>
```

#### GET /admin/orders/:orderNo — 订单详情

#### POST /admin/orders/:orderNo/force-cancel — 强制取消

```jsonc
// 请求
{ "reason": "违规操作" }
// 响应 data: null
```

**后端逻辑**：回补库存 + 释放座位（同用户取消），订单状态 → CANCELED

> 前端安全措施：操作员须先输入订单号后 4 位通过校验后才能提交，
> 后端无需额外校验，此为前端防误操作设计。

#### POST /admin/orders/:orderNo/refund/approval — 退款审批

```jsonc
// 请求
{ "approved": true }   // true 通过 / false 驳回
// 响应 data: null
```

**后端逻辑**：
- approved=true → 退款通过，回补库存 + 释放 SOLD 座位，订单状态 → REFUNDED
- approved=false → 驳回，订单状态 → PAID（恢复已支付）

---

## 五、错误码规范

### 5.1 HTTP 状态码

| HTTP | 含义 | 使用场景 |
|------|------|---------|
| 200 | 成功 | code=0 |
| 401 | 未认证 | token 过期/无效 |
| 403 | 无权限 | 普通用户访问管理端 |
| 422 | 参数校验失败 | 必填缺失、格式错误 |
| 409 | 冲突 | 座位被抢、订单状态不允许操作 |
| 423 | 锁定 | 限购超限、账户锁定 |
| 429 | 限流 | 请求过于频繁 |
| 503 | 服务不可用 | 座位/支付服务异常 |

### 5.2 业务错误码

| 业务码 | HTTP | 说明 |
|--------|------|------|
| 40201 | 422 | 演出不存在或已下架 |
| 40202 | 422 | 场次不存在 |
| 40203 | 422 | 票档不存在 |
| 40204 | 422 | 观演人信息不完整 |
| 40205 | 422 | 下单数量超出限购 |
| 40206 | 422 | 订单类型错误 |
| 40901 | 409 | 座位已被他人锁定 |
| 40902 | 409 | 订单状态不允许此操作 |
| 40903 | 409 | 订单已取消 |
| 40904 | 409 | 订单不存在 |
| 42301 | 423 | 已达限购上限 |
| 42302 | 423 | 账户被锁定 |
| 42901 | 429 | 请求过于频繁 |
| 50301 | 503 | 座位服务暂不可用 |
| 50302 | 503 | 支付服务暂不可用 |

---

## 六、状态联动规则（后端必须实现）

### 6.1 演出 ↔ 场次 双向联动

```
改演出状态 → 场次状态跟着变：
  ON_SALE  → 场次 ON_SALE
  SOLD_OUT → 场次 SOLD_OUT
  DRAFT    → 场次 NOT_STARTED
  END      → 场次 ENDED

改场次状态 → 演出状态跟着变：
  所有场次 SOLD_OUT → 演出 SOLD_OUT
  所有场次 ENDED    → 演出 END
  有场次 ON_SALE    → 演出 ON_SALE
```

### 6.2 场次 ↔ 票档 库存联动

```
场次 → SOLD_OUT：票档 remainingQuantity 全部清零
场次 → ON_SALE：票档 remainingQuantity = totalQuantity - soldQuantity 回算

下单：票档 remainingQuantity -= quantity, soldQuantity += quantity
取消：票档 remainingQuantity += quantity, soldQuantity -= quantity
退款：票档 remainingQuantity += quantity, soldQuantity -= quantity
```

### 6.3 场次 remainingCount 计算

```
场次 remainingCount = 该场次下所有票档 remainingQuantity 之和

remainingCount = 0 → 场次自动变 SOLD_OUT
新增票档/改库存 → remainingCount 需重新计算
```

### 6.4 座位状态联动

```
选座（锁座）：AVAILABLE → LOCKED
释放锁座：LOCKED → AVAILABLE
支付成功：LOCKED → SOLD
取消订单：LOCKED → AVAILABLE
退款通过：SOLD → AVAILABLE

管理员改座位状态：
  → SOLD：票档 soldQuantity+1, remainingQuantity-1
  → AVAILABLE：票档 soldQuantity-1, remainingQuantity+1
```

### 6.5 删除联动

```
删除演出 → 级联删除：场次 + 票档 + 座位
删除场次 → 级联删除：票档 + 座位 + 刷新演出状态
删除票档 → 级联删除：该票档座位 + 刷新场次 remainingCount
```

### 6.6 开售时间到点自动转在售

```
场次 status = NOT_STARTED 且 saleStartTime 已到 → 自动转为 ON_SALE
  → 同步票档 remainingQuantity 回算（6.2）
  → 刷新场次 remainingCount（6.3）
  → 联动演出状态（6.1）

触发时机：GET /sessions/:id 时检查（前端倒计时到点也会重新拉取触发）
```

> 前端在场次详情页展示开售倒计时，到点后自动重新拉取场次详情，
> 后端在此次请求中检测到开售时间已到即完成状态流转，无需额外接口。

---

## 七、对接步骤

1. 后端照本文档实现所有接口
2. 后端确认所有数据结构字段名与本文档一致（camelCase）
3. 前端修改 `frontend/.env.development`：
   ```
   VITE_API_BASE_URL=http://后端地址:端口
   VITE_USE_MOCK=false
   ```
4. 重启前端 `npm run dev`
5. 按以下流程联调测试：
   - 登录 → 浏览演出 → 选场次 → 选座 → 下单 → 支付 → 查看订单
   - 管理端：管理演出/场次/票档/座位/订单

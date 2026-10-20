# 03 HTTP 层与 API 模块

> 涉及文件：`api/http.ts`、`api/types.ts`、`api/modules/*`、`api/index.ts`

## 一、知识点清单

### 1. axios.create() 独立实例
- 创建专属实例，避免污染全局 `axios`，配置互不影响。
- 实例级配置：`baseURL='/api'`、`timeout:10000`、`headers['Content-Type']`。
- 知识点：**所有请求都走 `service` 实例**，拦截器只注册一次。

### 2. baseURL 与代理协作
- 前端代码统一写 `/api/xxx`，开发期 vite proxy 把 `/api/*` 转发到后端 `http://localhost:8080`。
- 生产期 nginx `location /api/` 反代到后端容器。
- 业务侧**永远不直接写后端地址**，环境差异由构建配置承担。

### 3. 请求拦截器（注入 JWT 与 Idempotency-Key）
```ts
service.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const custom = config as CustomAxiosRequestConfig
  if (custom.idempotencyKey) config.headers['Idempotency-Key'] = custom.idempotencyKey
  return config
})
```
- **JWT 模式**：`Authorization: Bearer <token>`，不用 Cookie，无 CSRF 风险。
- **Idempotency-Key**：下单/支付必带，相同 key 后端返回上次结果，**防止重复下单**。
- 知识点：拦截器是请求出口，**所有请求都过一遍**，集中处理鉴权/防重。

### 4. 响应拦截器（统一解析 {code,message,data,traceId}）
- PRD v2.0 统一响应结构：`code === 0` 视为成功，返回 `data`。
- 业务失败 `code !== 0`：构造 `BusinessError { code, message, httpStatus, traceId, bizCode }` 抛出。
- **TypeScript 泛型**：`get<T>` / `post<T>` 让调用方拿到精确类型，IDE 自动补全字段。
- 知识点：把"后端协议适配"集中在拦截器，业务层只关心 `data` 与 `BusinessError`。

### 5. 错误分层（HTTP + 业务码）
- HTTP 4xx/5xx 在拦截器的 `error` 分支处理，业务码在 `success` 分支（后端可能在 200 body 里返错）。
- **文案映射表**：`utils/error-code.ts` 中 `BIZ_ERROR_MESSAGES` 按业务码集中维护，避免散落业务。
- **traceId 联调**：错误对象带 `traceId`，前后端联调时给后端定位日志。

### 6. 强制登出（401 防抖）
- 401 / 42302（账户锁定）触发 `handleForceLogout()`：清 token + 跳 `/login?redirect=...`。
- **防抖**：`setTimeout(300ms)`，避免并发多个 401 请求重复跳转。
- 知识点：用 `window.location.href` 跳转而非 `router.push`，**避免 store 与 router 循环依赖**。

### 7. silent 静默模式
- `CustomAxiosRequestConfig.silent = true` 时拦截器不弹全局 Message。
- 适用场景：轮询（失败不该频繁打扰用户）、组件内自定义错误提示。

### 8. 分页契约
- 请求参数：`{ page, size, ...filters }`，**不用 pageNum/pageSize**（PRD v2.0 第 8 章权威）。
- 响应结构：`{ records: T[], total, page, size }`，泛型 `PageResult<T>` 包装。
- 落点：`BasePagination.vue` 双向绑定 page/size，统一 change 事件。

### 9. Barrel 出口（barrel pattern）
- `api/modules/index.ts` 统一 `export { orderApi, seatApi, ... }`。
- 业务侧 `import { orderApi } from '@/api'`，**命名稳定**，模块内部增删无感。
- 知识点：barrel 模式是「桶导出」，便于重构与按域聚合。

### 10. 类型集中维护
- `api/types.ts` 统一定义所有接口的 Request/Response 类型，避免散落各 module。
- 命名约定：前端 `camelCase`，若后端返 `snake_case`，在拦截器统一转 camel（或后端直接返 camel）。
- 知识点：**类型是前后端契约的 TS 表达**，联调时以类型对齐字段。

## 二、业务模块划分

| 模块 | 文件 | 端 | 核心接口 |
|---|---|---|---|
| auth | `modules/auth.ts` | 用户 | `/auth/login` `/auth/register` `/auth/profile` |
| event | `modules/event.ts` | 用户 | `GET /events` `GET /events/:id` |
| session | `modules/session.ts` | 用户 | `GET /events/:id/sessions` `GET /sessions/:id` `GET /sessions/:id/categories` |
| seat | `modules/seat.ts` | 用户 | `GET /sessions/:id/seats` `POST /seats/lock` `DELETE /seats/lock` |
| order | `modules/order.ts` | 用户 | `POST /orders`（带 Idempotency-Key）`GET /orders` `GET /orders/:no` |
| payment | `modules/payment.ts` | 用户 | `POST /pay/mock/notify` |
| reservation | `modules/reservation.ts` | 用户 | `POST /reservations` `GET /reservations` |
| admin/* | `modules/admin/*` | 管理 | CRUD 资源接口 |

## 三、典型调用范式

```ts
// 列表分页
const res = await eventApi.list({ page: 1, size: 12, keyword: '周杰伦' })
// res: PageResult<EventItem> = { records, total, page, size }

// 下单（必带幂等键）
const idempotencyKey = genOrderKey()
const order = await orderApi.create(payload, idempotencyKey)
// order: CreateOrderResponse = { orderNo, payAmount, status, expireTime }
```

## 四、错误处理流程图

```
请求 -> 请求拦截器（注入 token + idempotencyKey） -> 后端
       <- 响应拦截器:
            code === 0 ? return data
                       : 构造 BusinessError reject
                                          -> 业务 try/catch
                                          -> 全局 ElMessage.error（除非 silent）
                                          -> 401/锁定 -> handleForceLogout()
```

## 五、面试常见追问

**Q：为什么不在拦截器里做 401 跳 router.push？**
A：router 实例与 store 互相 import 会**循环依赖**。用 `window.location.href` 跳转最安全，强刷后状态干净。

**Q：Idempotency-Key 在什么时候生成？**
A：**进入下单页时生成一次**，存到 ref；点击提交按钮复用同一 key。同一 key 重复请求后端返回上次结果，**双保险防重**。

**Q：怎么保证泛型类型准确？**
A：`get<T>` 返回 `Promise<T>`，T 由调用方传入（如 `get<PageResult<EventItem>>(...)`）。业务侧拿到 `res.records` 直接有类型提示。

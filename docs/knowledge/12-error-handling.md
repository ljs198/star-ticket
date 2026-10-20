# 12 错误处理体系

> 涉及文件：`utils/error-code.ts`、`api/http.ts`、`stores/user.ts`

## 一、知识点清单

### 1. HTTP 状态码 + 业务码双层
- **HTTP 状态码**：4xx/5xx 粗判错误类型（401/403/404/422/409/423/429/503）。
- **业务码**：精确定位错误（40201 演出不存在、40901 座位被抢、42301 限购超限）。
- 知识点：**双层错误码体系**，HTTP 状态码粗分类，业务码精确定位，traceId 联调追踪。

### 2. PRD v2.0 错误码规范
| HTTP | 业务码段 | 含义 |
|---|---|---|
| 422 | 402xx | 参数校验失败 |
| 409 | 409xx | 冲突（座位被抢、订单已支付） |
| 423 | 423xx | 锁定（限购超限、账户锁定） |
| 429 | 429xx | 限流 |
| 503 | 503xx | 服务不可用 |

### 3. 文案映射表（集中维护）
```ts
const BIZ_ERROR_MESSAGES: Record<number, string> = {
  40201: '演出不存在或已下架',
  40901: '座位已被他人锁定',
  42301: '已达限购上限',
  42901: '请求过于频繁，请稍后再试',
  50301: '座位服务暂不可用'
  // ...
}
```
- 知识点：**文案集中维护**，避免散落业务代码；新增错误码只改此表，业务无感。

### 4. 拦截器错误处理流程
```
请求 -> 后端
       <- 响应:
            code === 0 ? return data  (成功)
                       :
                       构造 BusinessError { code, message, httpStatus, traceId, bizCode }
                       -> ElMessage.error(message) (除非 silent)
                       -> 401/42302 -> handleForceLogout()
                       -> reject BusinessError
                                          -> 业务 try/catch 捕获
```
- 知识点：**拦截器是错误处理统一出口**，业务层只关心 data 或 catch BusinessError。

### 5. BusinessError 类型
```ts
export interface BusinessError {
  code: number       // 业务码或 HTTP 状态
  message: string    // 文案
  httpStatus?: number
  traceId?: string   // 联调追踪
  bizCode?: number
}
```
- 业务侧 `catch (err) { const e = err as BusinessError; console.log(e.traceId) }`。
- 知识点：**traceId 给后端排查日志**，联调时把 traceId 发后端定位请求链路。

### 6. 401 强制登出（防抖）
```ts
let logoutTimer: number | null = null
function handleForceLogout() {
  if (logoutTimer) return  // 防抖：避免并发 401 重复跳转
  logoutTimer = window.setTimeout(() => {
    clearAuth()
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${redirect}`
    logoutTimer = null
  }, 300)
}
```
- 知识点：**并发请求同时 401 会触发多次跳转**，防抖只跳一次；用 `window.location.href` 避免 router 循环依赖。

### 7. silent 静默模式
- `CustomAxiosRequestConfig.silent = true` 时拦截器不弹全局 Message。
- 适用：轮询（失败不该频繁打扰用户）、组件内自定义错误提示。
- 知识点：**全局弹错是默认**，特殊场景用 silent 关闭，业务侧自定义处理。

### 8. 网络错误兜底
```ts
if (error.code === 'ECONNABORTED') ElMessage.error('请求超时，请稍后再试')
else if (!navigator.onLine) ElMessage.error('网络已断开，请检查网络')
else ElMessage.error('网络异常，请稍后再试')
```
- 知识点：**axios 超时/断网/未知错误**在拦截器 error 分支兜底，文案友好。

### 9. 限流与服务不可用重试
- `shouldRetry(status)` 判断 429/503 是否可重试。
- 业务侧可手动重试（如订单查询 503 时延迟 1s 重试）。
- 知识点：**429 限流**应退避重试，**503 服务不可用**可降级提示。

### 10. 账户锁定（42302）
- `shouldForceLogout(status, bizCode)` 判断 401 或 42302。
- 42302（账户被锁定）也踢出登录，提示联系客服。
- 知识点：**业务码 42302 是账户级锁定**，比 401（token 过期）更严重。

## 二、错误处理矩阵

| 场景 | HTTP | 业务码 | 前端处理 |
|---|---|---|---|
| 登录失效 | 401 | - | 清 token + 跳登录页 |
| 账户锁定 | 423 | 42302 | 清 token + 跳登录页 |
| 座位被抢 | 409 | 40901 | 提示 + 回滚选座 |
| 限购超限 | 423 | 42301 | 提示 + 数量回退 |
| 参数错误 | 422 | 402xx | 提示具体文案 |
| 限流 | 429 | 429xx | 提示 + 退避重试 |
| 服务不可用 | 503 | 503xx | 提示 + 降级 |
| 网络超时 | - | - | 提示"请求超时" |
| 断网 | - | - | 提示"网络已断开" |

## 三、业务侧典型用法

```ts
// 通用：拦截器已弹错，业务侧只需 try/catch 控制流程
try {
  const order = await orderApi.create(payload, key)
  router.push(`/pay/${order.orderNo}`)
} catch (err) {
  // 拦截器已 ElMessage.error，这里只控制流程（如不跳转）
  loading.value = false
}

// 静默模式：轮询不弹错
const detail = await orderApi.detail(orderNo)  // 配 silent
```

## 四、面试常见追问

**Q：为什么 401 用 window.location.href 跳转？**
A：router 实例与 store 互相 import 会**循环依赖**；`window.location.href` 强刷跳转，状态干净，避免循环。

**Q：防抖为什么 300ms？**
A：并发请求同时 401 时，300ms 内只跳一次，避免多次跳转冲突；过长则体验差。

**Q：业务码为什么不用 HTTP 状态码？**
A：HTTP 状态码粗分类（409 只能说"冲突"），**业务码精确**（40901 座位被抢 vs 40902 订单已支付）。双层体系兼顾粗筛与精确定位。

**Q：traceId 有什么用？**
A：联调时把 traceId 发后端，后端按 traceId 查日志链路，**快速定位问题请求**。生产环境排查 bug 利器。

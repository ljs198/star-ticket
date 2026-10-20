# 08 组合式函数 Composables

> 涉及文件：`composables/useCountdown.ts`、`useSeatLock.ts`、`useOrderStatus.ts`、`useSeatPolling.ts`、`useRequest.ts`、`index.ts`

## 一、知识点清单

### 1. Composition API 逻辑复用
- Composable 是**抽离可复用逻辑的函数**，命名 `useXxx`，返回 ref/computed/method。
- setup 中调用：`const { remaining, text } = useCountdown({ expireAt, onExpire })`。
- 知识点：**比 Mixins 更安全**（显式来源、无命名冲突、类型推导完整）。

### 2. 定时器管理（onUnmounted 清理）
```ts
let timer: number | null = null
function start() { timer = setInterval(tick, interval) }
function stop() { if (timer) clearInterval(timer); timer = null }
onUnmounted(stop)  // 组件卸载自动清理
```
- 知识点：**setInterval 不清理会内存泄漏**，组件卸载后定时器仍在跑。onUnmounted 是清理钩子。

### 3. useCountdown（倒计时）
- 输入 `expireAt`（ISO 字符串或时间戳），输出 `remaining`（秒）、`text`（mm:ss）。
- 归零触发 `onExpire` 回调。
- `reset(newExpireAt)` 重置新的过期时间（锁座成功后调用）。
- 落点：PayCountdown（订单超时）、SeatSelection（锁座超时）。
- 知识点：**expireAt 由后端返回**，前端时钟可能与后端有偏差，但展示倒计时足够精确。

### 4. useSeatLock（批量锁座）
- 输入：sessionId + seatIds，输出：`{ expireAt, failedSeatIds }`。
- **部分成功处理**：遍历 `results`，失败的 seatId 收集返回，UI 回滚为可售。
- 失败原因文案：`getFailReasonLabel(reason)`，`SEAT_TAKEN/NOT_AVAILABLE/LIMIT_EXCEEDED`。
- 成功则 `cartStore.setLockExpireAt(expireAt)`，倒计时驱动。
- unlock：离开选座页时释放座位，**静默失败**（不影响用户操作）。
- 知识点：**批量锁座可能部分成功**，前端必须逐个判断 results，失败的座位 UI 回滚。

### 5. useOrderStatus（订单状态 5s 轮询）
- 输入：orderNo + onStatusChange + interval(5s)。
- `fetchOnce` 拉订单详情，状态变化触发 `onStatusChange(status, detail)`。
- **单次失败不中断轮询**，累加 retryCount，达上限停止。
- 落点：PayMock 页，支付成功（PAID）后跳订单详情。
- 知识点：**轮询代替 WebSocket**，简单可靠；单次失败容错避免网络抖动停止轮询。

### 6. useSeatPolling（座位状态 30s 轮询）
- 输入：sessionId + onUpdate + interval(30s)。
- **secondsSinceUpdate**：每秒计算"距上次更新 X 秒前"，UI 显示"状态更新于 X 秒前"。
- **可见性 API**：`document.hidden` 监听，标签切走暂停轮询，回来恢复，**节省请求**。
- 知识点：可见性 API 是 `visibilitychange` 事件 + `document.hidden` 属性，**用户切走暂停轮询**节省带宽。

### 7. useRequest（通用请求封装）
- 输入：`fn`（请求函数）+ options。
- 输出：`data`（shallowRef）+ `loading` + `error` + `run` + `reset`。
- **防重入**：inflight Promise 缓存，loading 中再次调用直接返回上次 Promise。
- immediate 立即执行模式。
- 知识点：**抽离"请求 + loading + error"模板**，业务侧少写 try/catch，组件直接绑定 :loading。

### 8. shallowRef vs ref
- `useRequest` 用 `shallowRef` 存 data，**浅响应**，对象内部属性变化不触发更新。
- 知识点：**列表/详情数据整体替换**，不需要深响应；shallowRef 性能更好。

### 9. composable 生命周期
- composable 内 `onMounted/onUnmounted` 会**绑定到调用它的组件**。
- 知识点：composable 在 setup 中调用，其生命周期钩子自动注册到当前组件实例。

### 10. 返回值约定
- 返回 ref/computed/方法的对象，**不要解构后丢失响应**。
- 业务侧 `const { remaining } = useCountdown(...)`，remaining 是 ref，模板自动解包。
- 知识点：**返回 ref 而非裸值**，保持响应性；setup 中解构 ref 仍响应（Vue3 编译优化）。

## 二、Composable 矩阵

| Composable | 输入 | 输出 | 应用场景 |
|---|---|---|---|
| useCountdown | expireAt, onExpire | remaining, text, start/stop/reset | 订单/锁座倒计时 |
| useSeatLock | - | loading, lock, unlock | 选座页锁座 |
| useOrderStatus | orderNo, onStatusChange | currentStatus, start/stop | 支付页 5s 轮询 |
| useSeatPolling | sessionId, onUpdate | secondsSinceUpdate, start/stop | 选座页 30s 轮询 |
| useRequest | fn, options | data, loading, run, reset | 通用请求封装 |

## 三、典型用法

```ts
// 选座页
const { lock, unlock, loading } = useSeatLock()
const { secondsSinceUpdate } = useSeatPolling({
  sessionId,
  onUpdate: (areas) => { seatAreas.value = areas }
})
const { remaining, text, onExpire } = useCountdown({
  expireAt: cartStore.lockExpireAt,
  onExpire: () => { cartStore.clear(); ElMessage.warning('锁座已过期') }
})

// 支付页
const { currentStatus } = useOrderStatus({
  orderNo,
  onStatusChange: (status) => {
    if (status === 'PAID') router.push(`/orders/${orderNo}`)
  }
})
```

## 四、面试常见追问

**Q：composable 和 mixin 区别？**
A：composable 显式来源（`const { x } = useX()`），无命名冲突，TS 类型推导完整；mixin 隐式合并，命名冲突难追溯。**Vue3 推荐 composable**。

**Q：定时器为什么必须在 onUnmounted 清理？**
A：组件卸载后定时器仍在跑，会**内存泄漏 + 操作已卸载组件**报错。onUnmounted 是清理钩子。

**Q：useRequest 为什么要防重入？**
A：用户快速点击按钮，多个请求并发，结果乱序。**inflight Promise 缓存**保证同时间只一个请求，结果一致。

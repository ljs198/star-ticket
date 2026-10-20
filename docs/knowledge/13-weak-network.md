# 13 弱网兜底

> 涉及文件：`composables/*`、`stores/order.ts`、`stores/cart.ts`、`views/user/seat/SeatSelection.vue`、`api/http.ts`

## 一、知识点清单

### 1. 观演人表单草稿（localStorage）
- `useOrderStore.saveAttendeeDraft(attendees)`：输入时防抖 500ms 自动保存。
- `loadAttendeeDraft()`：进入页面恢复草稿，避免重新填写。
- 下单成功 `clearAttendeeDraft()` 清空。
- 知识点：**localStorage 持久化**，刷新/误关页面不丢表单，PRD v2.0 第 12 条要求。

### 2. 锁座状态恢复（页面刷新）
- 进入选座页，若 `cartStore` 为空，调 `seatApi.getMyLockedSeats(sessionId)` 恢复。
- 后端按 lockUserId 返回当前用户的锁定座位 + `expireAt`。
- `cartStore.restoreFromLockedSeats(seats, expireAt)` 恢复选座态。
- 知识点：**锁座状态在后端持久化**，前端刷新不丢锁，避免用户重新选。

### 3. 轮询单次失败容错
- `useOrderStatus` / `useSeatPolling` 单次失败**不中断轮询**，累加 retryCount。
- 达 maxRetries 才停止，避免网络抖动导致轮询停止。
- 知识点：**轮询容错**，单次失败保留旧数据，避免页面闪烁。

### 4. 旧数据保留（避免闪烁）
- 轮询失败时**不更新 state**，UI 显示上次成功的数据。
- 知识点：**乐观更新 + 失败保留**，用户体验稳定，避免数据忽有忽无。

### 5. 可见性 API 暂停轮询
- `document.hidden` 监听 `visibilitychange`，标签切走暂停轮询，回来恢复。
- 知识点：**节省请求**，用户切走时不浪费带宽；回来立即拉一次最新数据。

### 6. 锁座失败回滚
- 乐观更新：先 addSeat UI 即时响应；锁失败 removeSeat 回滚 + 提示。
- 知识点：**乐观更新提升体验**，失败回滚保证一致性。

### 7. 请求超时配置
- Axios `timeout: 10000`（10s），超时触发 `ECONNABORTED`。
- 拦截器 error 分支兜底"请求超时"文案。
- 知识点：**10s 超时是 PRD v2.0 统一配置**，弱网下不至于无限等待。

### 8. 断网检测
```ts
if (!navigator.onLine) ElMessage.error('网络已断开，请检查网络')
```
- `navigator.onLine` 检测在线状态，断网时友好提示。
- 知识点：**断网兜底**，避免用户困惑为何请求无响应。

### 9. 静默模式避免打扰
- 轮询请求配 `silent: true`，失败不弹全局 Message。
- 知识点：**轮询频繁失败会刷屏**，静默模式让业务侧自定义处理（如显示"网络异常"角标）。

### 10. 限流退避重试
- `shouldRetry(status)` 判断 429/503 可重试。
- 业务侧可延迟 1s 重试（如订单查询 503）。
- 知识点：**429 限流**应退避（指数退避），**503 服务不可用**可降级提示。

### 11. 倒计时容错
- `useCountdown` 用本地时间计算，**网络延迟不影响倒计时展示**。
- 锁座/订单超时由后端 expireAt 驱动，前端时钟偏差在秒级可接受。
- 知识点：**倒计时是本地计算**，弱网下仍正常显示，归零才触发业务回调。

### 12. 离开页面释放座位
- `onBeforeRouteLeave` 守卫：跳转非 confirm 页面时 unlock 释放座位。
- 释放失败静默处理（后端可能已超时释放）。
- 知识点：**主动释放是礼貌**，避免座位被锁 15 分钟影响他人；失败静默不影响用户。

## 二、弱网场景矩阵

| 场景 | 兜底策略 | 落点 |
|---|---|---|
| 观演人表单误关 | localStorage 草稿恢复 | order store |
| 选座页刷新 | getMyLockedSeats 恢复 | SeatSelection + cart store |
| 轮询单次失败 | 保留旧数据，不中断轮询 | useSeatPolling / useOrderStatus |
| 标签切走 | visibilitychange 暂停轮询 | useSeatPolling |
| 锁座失败 | 乐观更新 + 回滚 | useSeatLock + SeatSelection |
| 请求超时 | 10s 超时 + 友好提示 | http.ts |
| 断网 | navigator.onLine 检测 | http.ts |
| 轮询频繁失败 | silent 模式不刷屏 | http.ts silent |
| 限流 | 退避重试 | shouldRetry |
| 倒计时 | 本地时间计算，不受网络影响 | useCountdown |
| 离开选座页 | 主动释放座位 | onBeforeRouteLeave |

## 三、用户体验目标

1. **不丢数据**：表单草稿、锁座状态、订单草稿都持久化。
2. **不闪烁**：轮询失败保留旧数据，UI 稳定。
3. **不打扰**：静默模式避免刷屏错误提示。
4. **不无限等待**：10s 超时 + 友好文案。
5. **不丢锁**：刷新页面后端恢复锁定座位。

## 四、面试常见追问

**Q：观演人草稿为什么存 localStorage 而非 store？**
A：**store 是内存态刷新即丢**，localStorage 持久化；下单成功后清空，避免脏数据。

**Q：轮询失败为什么不停？**
A：**单次失败可能是网络抖动**，停了用户就看不到最新状态；保留旧数据 + 重试，体验稳定。

**Q：锁座失败回滚会不会让用户困惑？**
A：弹 `getFailReasonLabel(failReason)` 文案（如"座位已被他人锁定"），用户**明确感知被抢**，立即换座。比"提交失败"友好。

**Q：可见性 API 暂停轮询有什么用？**
A：用户切走标签时**不浪费带宽**，回来立即拉最新数据。**省电省流量**，移动端友好。

# 10 选座模块（核心）

> 涉及文件：`views/user/seat/SeatSelection.vue`、`components/seat/*`、`stores/cart.ts`、`composables/useSeatLock.ts`、`composables/useSeatPolling.ts`、`utils/seat-status.ts`、`api/modules/seat.ts`

## 一、知识点清单

### 1. 批量锁座接口（PRD v2.0 第 3 条）
- `POST /seats/lock { sessionId, seatIds:[1-4] }` -> `{ expireAt, results:[{seatId, success, failReason}] }`
- **批量 1-4 个**：少于 1 或多于 4 后端拒（40205/LIMIT_EXCEEDED）。
- failReason 枚举：`SEAT_TAKEN`（被抢）/ `NOT_AVAILABLE`（不可售）/ `LIMIT_EXCEEDED`（超限）。
- 落点：`seatApi.lock` + `useSeatLock` composable。

### 2. 部分成功处理
- 后端返 `results` 数组，**逐个判断 success**。
- 成功的座位保持选中态；失败的座位 `cartStore.removeSeat(seatId)` + UI 回滚为可售。
- 失败文案：`getFailReasonLabel(failReason)` 弹 warning。
- 知识点：**批量操作可能部分成功**，前端不能假设全成功或全失败。

### 3. 锁座过期时间驱动倒计时
- 后端返 `expireAt`（ISO 字符串），写入 `cartStore.lockExpireAt`。
- `useCountdown({ expireAt })` 驱动倒计时，归零 `onExpire -> cartStore.clear()`。
- 知识点：**倒计时由后端 expireAt 驱动**，前端时钟可能与后端有偏差，但 15 分钟级别足够精确。

### 4. 30s 轮询座位状态
- `useSeatPolling(sessionId, { onUpdate: setAreas, interval: 30000 })`。
- 显示"状态更新于 X 秒前"：`secondsSinceUpdate` 每秒 +1。
- 知识点：**轮询让多用户选座时实时看到他人锁定**，避免下单时才发现被抢。

### 5. 页面刷新恢复（弱网兜底）
- 进入选座页时，若 `cartStore` 为空，调 `seatApi.getMyLockedSeats(sessionId)` 恢复。
- 后端按 lockUserId 返回当前用户的锁定座位 + `expireAt`。
- `cartStore.restoreFromLockedSeats(seats, expireAt)` 恢复选座态。
- 知识点：**锁座状态在后端持久化**，前端刷新不丢锁，避免用户重新选。

### 6. 离开页面释放座位
- `onBeforeRouteLeave` 守卫：若跳转目标不是 `/orders/confirm` 且 `cartStore.count > 0`，调 `unlock` 释放。
- 释放失败静默处理（后端可能已超时释放），不影响用户跳转。
- 知识点：**主动释放是礼貌**，避免座位被锁 15 分钟影响他人。

### 7. LOCKED 状态二次区分
- LOCKED 状态需按 `lockUserId` 区分：
  - 我锁的：紫色（`--color-seat-locked-me`）+ 可点（取消选中）
  - 他人锁定：灰色（`--color-seat-locked-other`）+ 不可点
- 判断：`seat.status === LOCKED && seat.lockUserId === currentUserId`。
- 知识点：**状态机不只是 4 态**，LOCKED 实际是两子态。

### 8. 限购上限置灰
- `MAX_SEAT_COUNT = 4`：达上限后 AVAILABLE 座位置灰不可点（除非已选）。
- `SeatItem.disabled` prop 由 `cartStore.isFull` 计算。
- 知识点：**前端限购只是体验**，后端再校验 LIMIT_EXCEEDED。

### 9. 底部固定操作栏
- 显示：已选座位列表（"A1, A2"）+ 数量 + 总价（formatMoneyWithSymbol）+ "确认选座"按钮。
- 按钮 disabled 条件：`cartStore.isEmpty || !cartStore.isLocked`。
- 点击 -> 校验 `lockExpireAt` 在未来 -> `router.push('/orders/confirm')`。
- 知识点：**sticky bottom bar 是票务 App 标配**，操作触手可及。

### 10. 选座 -> 锁座 -> 下单链路
```
选座 -> addSeat -> useSeatLock.lock (批量) -> 成功写 cartStore.lockExpireAt
              -> useCountdown 倒计时
              -> 30s useSeatPolling 刷新座位图
              -> 点击"确认选座" -> router.push('/orders/confirm')
离开页面（非 confirm）-> unlock 释放
```

### 11. 组件协作
- `SeatSelection.vue`（页面）：协调 store + composable + 组件。
- `SeatMap` -> `SeatArea` -> `SeatRow` -> `SeatItem`（四层组件树）。
- 数据自上而下（props areas/selectedIds/disabled），事件自下而上（emit select）。

### 12. 锁座失败 UI 回滚
```ts
async function handleSelect(seat: Seat) {
  if (cartStore.selectedSeats.some(s => s.id === seat.id)) {
    cartStore.removeSeat(seat.id)  // 取消选中
    await unlock(sessionId, [seat.id])
    return
  }
  if (cartStore.isFull) return ElMessage.warning('最多选择 4 个座位')
  cartStore.addSeat(seat)
  const { failedSeatIds } = await lock(sessionId, [seat.id])
  if (failedSeatIds.includes(seat.id)) {
    cartStore.removeSeat(seat.id)  // 锁失败回滚
  }
}
```
- 知识点：**乐观更新 + 失败回滚**：先 addSeat 让 UI 即时响应，锁失败再 removeSeat 回滚。

## 二、状态机流转

```
AVAILABLE --(点击)--> [addSeat + lock] --成功--> LOCKED(我) --(点击)--> [removeSeat + unlock] --> AVAILABLE
                                --失败--> AVAILABLE (回滚)
LOCKED(他人) --30s轮询--> 可能变 SOLD（被买）或 AVAILABLE（释放）
SOLD / DISABLED --> 不可点击
```

## 三、关键约束（PRD v2.0 不变性）

1. 批量 1-4 个，超 4 后端拒（LIMIT_EXCEEDED）。
2. 锁座 15 分钟自动释放，前端按 expireAt 倒计时。
3. LOCKED 按 lockUserId 二次区分，颜色固定。
4. 离开选座页（非下单）主动释放。
5. 刷新页面后端恢复锁定座位。
6. 价格以后端为准，前端 cart 只存 seat.price（用于展示），下单不传价。

## 四、面试常见追问

**Q：为什么选座即锁座，而不是批量提交时锁？**
A：**抢票场景**实时锁座避免多用户选同一座位冲突；批量提交时锁可能多人同时选中，用户体验差。

**Q：锁座失败了怎么处理？**
A：乐观更新 + 失败回滚：先 addSeat UI 即时响应，锁失败 removeSeat 回滚 + 弹 failReason 文案。**用户感知"被抢"立即换座**。

**Q：30s 轮询会不会太频繁？**
A：抢票场景需要准实时，30s 是性能与实时性的平衡；**可见性 API 暂停**（标签切走）节省请求。

**Q：刷新页面锁座丢了吗？**
A：不丢。后端按 lockUserId 持久化锁，前端 `getMyLockedSeats` 恢复 + expireAt 继续倒计时。**弱网兜底**。

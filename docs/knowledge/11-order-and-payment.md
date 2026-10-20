# 11 订单与支付

> 涉及文件：`views/user/order/OrderConfirm.vue`、`views/user/payment/PayMock.vue`、`views/user/order/OrderList.vue`、`views/user/order/OrderDetail.vue`、`stores/order.ts`、`composables/useOrderStatus.ts`、`utils/order-status.ts`、`utils/idempotency.ts`

## 一、知识点清单

### 1. 下单接口契约（PRD v2.0 第 8 章）
- `POST /orders` Header `Idempotency-Key: <uuid>`（必填）
- Body：
```json
{
  "sessionId": 1,
  "orderType": "SEAT" | "NORMAL",
  "items": [{ "ticketCategoryId": 1, "quantity": 2, "seatIds": [101, 102] }],
  "attendees": [{ "name": "张三", "phone": "13800138000", "idCard": "110101199001011234" }]
}
```
- 响应：`{ orderNo, payAmount, status, expireTime }`
- 知识点：**价格不传**（后端计算），前端只传数量/座位，金额读响应 payAmount。

### 2. Idempotency-Key 防重（双保险）
```ts
const idempotencyKey = ref('')  // 进入页面生成一次
onMounted(() => { idempotencyKey.value = genOrderKey() })

async function submit() {
  loading.value = true  // 按钮 loading 防重复点击
  const order = await orderApi.create(payload, idempotencyKey.value)
  loading.value = false
}
```
- **第一保险**：按钮 loading 阻止重复点击。
- **第二保险**：Idempotency-Key 相同则后端返回上次结果。
- 知识点：**网络重试/用户连击**都会触发后端去重，避免重复下单。

### 3. orderType 区分（SEAT vs NORMAL）
- SEAT：选座下单，items 含 `seatIds`，quantity = seatIds.length。
- NORMAL：普通下单，items 不含 seatIds，quantity 用户选择。
- 判断：`selectedSeats.length > 0 ? 'SEAT' : 'NORMAL'`。
- 知识点：**两种下单模式共享同一接口**，后端按 orderType + seatIds 处理。

### 4. 观演人表单草稿（localStorage）
- `useOrderStore.saveAttendeeDraft(attendees)`：输入时防抖 500ms 自动保存。
- `loadAttendeeDraft()`：进入页面恢复草稿，避免重新填写。
- 下单成功 `clearAttendeeDraft()` 清空。
- 知识点：**弱网/误关页面不丢表单**，PRD v2.0 第 12 条要求。

### 5. 限购约束
- NORMAL 模式 quantity 上限：`category.limitPerUser`（含未支付+已支付+已完成）。
- 数量选择器 max 设为 `limitPerUser`，达上限禁用 +1。
- 知识点：**前端限购只是体验**，后端再校验 40205/LIMIT_EXCEEDED。

### 6. 支付接口契约
- `POST /pay/mock/notify { orderNo, amount, payNo }` Header `Idempotency-Key`
- 响应：`{ payNo, orderStatus, duplicated }`
- `duplicated: true` 表示重复支付（已支付过），前端提示"请勿重复支付"。
- 知识点：**payNo 前端生成 UUID**，相同 payNo 后端返上次结果，幂等。

### 7. 5s 轮询订单状态
- `useOrderStatus({ orderNo, onStatusChange, interval: 5000 })`。
- 状态变化触发 `onStatusChange(status, detail)`：
  - UNPAID -> PAID：支付成功，跳订单详情。
  - UNPAID -> CANCELED：超时关单，提示已关闭。
- 知识点：**轮询代替 WebSocket**，简单可靠；单次失败不中断轮询。

### 8. 订单超时倒计时
- `useCountdown({ expireAt: order.expireTime, onExpire })`。
- 归零 -> ElMessage.warning('订单已关闭') + router.push(`/orders/${orderNo}`)。
- 知识点：**expireTime 由后端驱动**，15 分钟关单。

### 9. 订单状态机（6 条迁移，后端驱动）
```
UNPAID --支付成功--> PAID
UNPAID --取消/超时--> CANCELED
PAID --申请退款--> REFUNDING
REFUNDING --退款成功--> REFUNDED
REFUNDING --退款驳回--> PAID（恢复）
PAID --观演结束--> FINISHED（定时任务）
```
- 前端严格按 `status` 字段渲染按钮，**不自行推断流转**。
- `canCancel(status)` / `canPay(status)` / `canRefund(status)` 辅助判断。
- 知识点：**状态机是后端的**，前端只读 status 决定 UI。

### 10. 敏感操作二次确认（PRD v2.0 第 17 条）
```ts
async function cancelOrder(orderNo: string) {
  await ElMessageBox.confirm('确认取消此订单？取消后无法恢复', '取消订单', { type: 'warning' })
  await orderApi.cancel(orderNo)
  ElMessage.success('订单已取消')
}
```
- 取消订单、申请退款、管理员强制取消均弹 `ElMessageBox.confirm`。
- 知识点：**二次确认防误操作**，是 PRD v2.0 安全要求。

### 11. 跨页面状态共享
- 下单成功 `useOrderStore.setCurrentOrder(order)`，支付页读 `currentOrder`。
- 知识点：**store 跨页面共享**，避免支付页重新请求订单详情（仍轮询刷新）。

### 12. 订单列表分页
- `orderApi.list({ page, size, status })` -> `PageResult<OrderListItem>`。
- 状态筛选：el-select 选项来自 `OrderStatus` 枚举。
- BaseTable 渲染，OrderStatusTag 显示状态。
- 知识点：**列表分页统一契约**，page/size 请求，records/total 响应。

## 二、下单流程图

```
选座页 -> 确认选座 -> router.push('/orders/confirm')
                          |
                          v
              OrderConfirm.vue
              - 读 cartStore (sessionId, selectedSeats, currentCategoryId)
              - orderType = selectedSeats.length > 0 ? 'SEAT' : 'NORMAL'
              - 观演人表单 (草稿恢复)
              - idempotencyKey = genOrderKey() (onMounted 一次)
              - 提交按钮 loading
                          |
                          v
              orderApi.create(payload, idempotencyKey)
                          |
                          v
              { orderNo, payAmount, status, expireTime }
              - setCurrentOrder(res)
              - clearAttendeeDraft()
              - router.push(`/pay/${orderNo}`)
                          |
                          v
              PayMock.vue
              - 读 currentOrder (或 fetch detail)
              - useCountdown(expireTime) 倒计时
              - useOrderStatus 5s 轮询
              - 点击"模拟支付":
                payNo = genPayKey()
                idempotencyKey = genPayKey()
                paymentApi.mockPay({orderNo, amount, payNo}, idempotencyKey)
                          |
                          v
              { payNo, orderStatus, duplicated }
              - duplicated=true -> 提示"请勿重复支付"
              - orderStatus=PAID -> 跳订单详情
```

## 三、关键约束（PRD v2.0 不变性）

1. 下单必带 Idempotency-Key 头。
2. 请求体不含价格字段，金额读响应 payAmount。
3. orderType='SEAT' 时 items 含 seatIds，quantity=seatIds.length。
4. 支付回调幂等，duplicated=true 表示重复。
5. 订单 15 分钟超时关单，倒计时由 expireTime 驱动。
6. 状态机 6 条迁移，PAID->FINISHED 由定时任务（非自动）。
7. 取消/退款/强制取消均二次确认。
8. 观演人草稿 localStorage 持久化。

## 四、面试常见追问

**Q：Idempotency-Key 什么时候生成？**
A：**进入下单页 onMounted 生成一次**，存 ref；点击提交复用同一 key。同 key 重复请求后端返上次结果，**双保险防重**（按钮 loading + key）。

**Q：为什么不传价格？**
A：**价格以后端计算为准**（PRD v2.0 第 1 条），前端传价不可信（可篡改）。前端只传数量/座位，金额读响应 payAmount。

**Q：支付轮询为什么 5s？**
A：支付场景需要准实时反馈（用户等待），5s 是体验与性能的平衡；**轮询代替 WebSocket** 简单可靠，无连接维护成本。

**Q：订单状态机能前端推断吗？**
A：**不能**。前端只读 status 字段渲染按钮，流转由后端驱动。**前端推断会导致状态不一致**（如定时任务 PAID->FINISHED 前端不知道）。

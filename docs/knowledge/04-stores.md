# 04 Pinia 状态管理

> 涉及文件：`stores/user.ts`、`stores/cart.ts`、`stores/order.ts`、`stores/index.ts`

## 一、知识点清单

### 1. Pinia 2 Setup Store（函数式）
- 用 `defineStore('user', () => { ... })` 函数式语法，**比 Options Store 更灵活**。
- state 用 `ref`，getters 用 `computed`，actions 用普通函数。
- 必须 `return` 暴露的成员（Options Store 自动暴露 state/getters/actions）。
- 知识点：Setup Store 与 Composition API 风格一致，**逻辑可抽 composable 复用**。

### 2. 状态：token / user / role
- `user` store 维护登录态：`token`（JWT）、`user`（用户信息）、`role`（USER/ADMIN）。
- `isLogin` getter：`!!token.value`，**懒校验**（不实时查过期，由后端 401 触发踢出）。
- `isAdmin` getter：`role.value === 'ADMIN'`，路由守卫与 `v-permission` 依赖此字段。
- 知识点：**前端权限只做体验**（隐藏按钮/路由），真实鉴权在后端。

### 3. 持久化（localStorage）
- 登录成功后 `setToken(res.token)` + `setStoredUser(res.user)`。
- `bootstrap()` 在 `App.vue` 启动时调用，从 localStorage 恢复到 store，**保证路由守卫第一次执行 token 已就位**。
- 知识点：**store 是内存态，刷新即丢**，需配合 localStorage 才能持久化。

### 4. cart store（选座购物车）
- 命名 `cart`（PRD v2.0 第 3 章权威）：选座 = 加购，下单时从 cart 取出。
- 状态：`sessionId`、`eventId`、`selectedSeats`、`lockExpireAt`、`currentCategoryId`。
- `isFull` getter：`count >= MAX_SEAT_COUNT (4)`，达上限 UI 置灰。
- `isLocked` getter：`lockExpireAt` 存在且未过期，控制"确认选座"按钮可点。
- `totalAmount` getter：`selectedSeats.reduce((s, p) => s + s.price, 0)`，单位分。
- `setSession(sid, eid)`：**切换场次时清空已选**，避免跨场次混选。
- `restoreFromLockedSeats`：从后端"我的座位"恢复（页面刷新场景）。
- 知识点：**选座状态机集中在 cart store**，组件只读写 store，逻辑可测试。

### 5. order store（草稿 + 当前订单）
- `currentOrder`：下单成功后写入，支付页跳转时读取，**跨页面共享**。
- `saveAttendeeDraft` / `loadAttendeeDraft`：观演人表单存 localStorage，**弱网兜底**（PRD v2.0 第 12 条）。
- 知识点：**草稿存 localStorage 而非 store**，刷新不丢；下单成功后 `clearAttendeeDraft` 清空。

### 6. 跨 store 协作
- SeatSelection 页面：写 cart store（addSeat/removeSeat/setLockExpireAt）。
- OrderConfirm 页面：读 cart store（selectedSeats/currentCategoryId）+ 读写 order store（草稿）。
- 知识点：**store 之间通过调用方组合**，不直接互相 import，避免循环依赖。

### 7. onUnmounted 清理
- store 是单例，**组件卸载不会清 store**。
- 选座页离开时由 `onBeforeRouteLeave` 主动调用 `cartStore.clear()` 或 unlock。
- 知识点：Pinia store 生命周期挂载到 Pinia 实例，**比组件更长寿**，需手动清理临时态。

### 8. reset / clear 命名约定
- `userStore.reset()`：清空登录态（被 401 踢出时用）。
- `cartStore.clear()`：清空选座（切场次/锁过期/离开页面时用）。
- `orderStore.clearCurrentOrder()`：清当前订单（支付完成后用）。

## 二、典型用法

```ts
// 在 setup 中
const cartStore = useCartStore()
console.log(cartStore.count, cartStore.totalAmount)
cartStore.addSeat(seat)

// 在路由守卫中（非 setup）
router.beforeEach(() => {
  const userStore = useUserStore()
  if (!userStore.isLogin) return '/login'
})
```

知识点：**setup 外使用 store 须在 pinia 已注册后**（main.ts `app.use(pinia)` 之后）。路由守卫执行时 Pinia 已就位。

## 三、状态流转图

```
登录页                     选座页                  下单页                支付页
  |                          |                       |                    |
  | userStore.login()       | cartStore.addSeat()  | 读 cartStore       | 读 orderStore.currentOrder
  | -> setToken/setUser     | -> useSeatLock.lock  | -> orderApi.create |
  v                          v -> setLockExpireAt   v -> setCurrentOrder v
[token, user in store]     [selectedSeats,         [currentOrder         [5s 轮询]
                            lockExpireAt in store]  in store]
```

## 四、面试常见追问

**Q：为什么用 Setup Store 而不是 Options Store？**
A：Setup Store 与 Composition API 风格统一，逻辑可抽 composable 复用，更灵活；Options Store 是 Pinia 1 风格。

**Q：store 刷新就丢怎么办？**
A：token/user 存 localStorage，App.vue 启动时 `bootstrap()` 恢复。**业务临时态（如 cart）不持久化**，避免跨页面脏数据。

**Q：role 前端校验安全吗？**
A：**不安全**，前端只做体验层（隐藏按钮/路由），真实鉴权在后端。用户改 role 也调不动 admin API（后端 403）。

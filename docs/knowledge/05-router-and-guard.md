# 05 路由与守卫

> 涉及文件：`router/index.ts`、`routes/index.ts`、`routes/user.ts`、`routes/admin.ts`、`guard.ts`

## 一、知识点清单

### 1. createWebHistory（HTML5 history 模式）
- URL 无 `#`，更美观，SEO 友好。
- **必须服务端配合**：nginx `try_files $uri $uri/ /index.html` 兜底，避免刷新 404。
- 落点：`nginx.conf` 的 `location /` 已配置兜底。

### 2. 懒加载（`() => import()`）
- 每个路由组件单独分包，**首屏只加载访问的页面**，加速首屏。
- Vite 自动生成 chunk，配合 `manualChunks` 优化。
- 知识点：`() => import('@/views/user/event/EventList.vue')` 返回 Promise，路由匹配时才请求 chunk。

### 3. 嵌套路由（children）
- 管理端用嵌套：`/admin` 父路由套 `AdminLayout`，子路由渲染具体页面。
- 父路由 `component: AdminLayout`，子路由在父的 `<router-view>` 出口渲染。
- 用户端用单层：`/` 父套 `PortalLayout`，子路由平铺。
- 知识点：**嵌套适合布局固定的后台**，单层适合布局灵活的 C 端。

### 4. meta 元信息
- `meta.title`：页面标题，守卫中同步 `document.title`。
- `meta.requiresAuth`：是否需登录。
- `meta.roles`：所需角色列表（如 `['ADMIN']`）。
- 知识点：meta 是路由的"附加数据"，**守卫读取 meta 决定策略**，路由声明即权限。

### 5. 路由守卫（beforeEach）
```ts
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth as boolean
  const roles = to.meta.roles as string[]
  if (!requiresAuth) return next()
  if (!userStore.isLogin) return next({ path: '/login', query: { redirect: to.fullPath } })
  if (roles && !roles.includes(userStore.role)) return next('/403')
  next()
})
```
- **未登录跳登录页带 redirect**：登录后 `router.push(redirect)` 回原页面，不丢上下文。
- **角色不符跳 403**：避免越权访问。
- 知识点：守卫是**全局前置**，每次跳转都触发；多个守卫按注册顺序执行。

### 6. scrollBehavior
- 切换路由滚到顶部；带 hash 滚到锚点；浏览器前进后退保留滚动位置（savedPosition）。
- 知识点：history 模式默认不保留滚动，需手动配置。

### 7. 路径设计（PRD v2.0 第 3 章权威）
- 首页 `/events`（不是 `/home`）
- 选座 `/seats/:sessionId`
- 下单 `/orders/confirm`（不是 `/order/confirm`）
- 个人中心 `/profile`（v2.0 新增）
- 管理端嵌套 `/admin/events/:id/sessions`、`/admin/sessions/:id/categories`、`/admin/sessions/:id/seats`
- 知识点：**RESTful 风格资源路径**，嵌套表达从属关系（场次属于演出）。

### 8. 404 兜底
- `{ path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound }` 放路由表最后。
- 知识点：Vue Router 4 用 `:pathMatch(.*)*` 匹配任意未命中路径，比 v3 的 `*` 更明确。

### 9. 守卫执行时机
- `app.use(router)` 后，首次 `app.mount` 会触发首次导航。
- `setupRouterGuard(router)` 在 `router/index.ts` 内调用，**返回 router 前已注册**。
- App.vue `bootstrap()` 恢复 token 在 mount 时执行，**早于第一次导航守卫**。

## 二、路由表结构

```
/ (PortalLayout)
├── /events              EventList
├── /events/:id          EventDetail
├── /sessions/:id        SessionDetail
├── /seats/:sessionId    SeatSelection    [requiresAuth]
├── /orders/confirm      OrderConfirm     [requiresAuth]
├── /orders              OrderList        [requiresAuth]
├── /orders/:orderNo     OrderDetail      [requiresAuth]
├── /pay/:orderNo        PayMock          [requiresAuth]
├── /reservations        MyReservations   [requiresAuth]
├── /profile             Profile          [requiresAuth]
├── /login               Login
└── /register            Register

/admin (AdminLayout)     [requiresAuth, roles=['ADMIN']]
├── /admin/events        EventManage
├── /admin/events/new    EventEdit
├── /admin/events/:id/edit              EventEdit
├── /admin/events/:id/sessions          SessionManage
├── /admin/sessions/:id/categories      CategoryManage
├── /admin/sessions/:id/seats           SeatManage
└── /admin/orders        OrderManage

/:pathMatch(.*)*         NotFound
```

## 三、面试常见追问

**Q：history 模式刷新 404 怎么解决？**
A：服务端配 `try_files $uri $uri/ /index.html`，所有未命中静态资源的请求回退到 index.html，由前端路由接管。

**Q：路由懒加载的好处？**
A：按需加载，**首屏只加载访问的页面 chunk**，加速首屏；缺点是切换路由有短暂 loading（可配合 Suspense）。

**Q：meta.requiresAuth 为什么不放路由 name 判断？**
A：meta 是声明式的，**路由定义即权限**，新增路由只改 meta，不用改守卫逻辑，扩展性好。

# 星幕票务前端 — 知识点说明文档总览

> 配套实现文档：《星幕票务-前端设计与实现文档.md》v2.0
> 本目录按模块拆分，每篇说明该模块运用到的核心知识点、在代码中的落点、以及为何这样设计。

## 文档索引

| 编号 | 文档 | 模块 | 核心知识点 |
|---|---|---|---|
| 01 | [工程骨架与构建](./01-skeleton-and-build.md) | package.json / vite.config.ts / tsconfig.json | Vite5、ESM、TS5、路径别名、SCSS 全局注入、自动导入、开发代理 |
| 02 | [设计系统与样式](./02-styles-and-design-tokens.md) | assets/styles/ | CSS 变量、SCSS 变量、设计 Token、reset、工具类、暗色主题预留 |
| 03 | [HTTP 层与 API 模块](./03-http-and-api.md) | api/http.ts、api/modules/ | Axios 实例、请求/响应拦截器、JWT Header、Idempotency-Key、统一响应解析、错误分层、TypeScript 泛型 |
| 04 | [Pinia 状态管理](./04-stores.md) | stores/user、cart、order | Setup Store、Composition API、持久化、跨 store 协作、cart 选座状态机 |
| 05 | [路由与守卫](./05-router-and-guard.md) | router/、guard.ts | Vue Router4、history 模式、懒加载、嵌套路由、meta 元信息、权限守卫、滚动行为 |
| 06 | [布局组件](./06-layout.md) | layout/PortalLayout、AdminLayout | el-container、el-menu、响应式导航、嵌套路由出口 |
| 07 | [通用组件库](./07-components.md) | components/base、event、order、seat | 二次封装、props 透传、插槽、v-model、可复用设计 |
| 08 | [组合式函数 Composables](./08-composables.md) | composables/ | 逻辑复用、定时器管理、onUnmounted 清理、轮询、防重入、可见性 API |
| 09 | [自定义指令](./09-directive.md) | directive/permission.ts | Directive 钩子、权限控制、DOM 移除 |
| 10 | [选座模块（核心）](./10-seat-selection.md) | SeatSelection.vue + cart + useSeatLock + useSeatPolling | 批量锁座、部分成功处理、状态轮询、离开释放、倒计时驱动、弱网恢复 |
| 11 | [订单与支付](./11-order-and-payment.md) | OrderConfirm + PayMock + useOrderStatus | Idempotency-Key 防重、orderType 区分、观演人草稿、5s 轮询、支付幂等 |
| 12 | [错误处理体系](./12-error-handling.md) | utils/error-code.ts + http.ts | HTTP 状态码、业务码分层、traceId、401 踢出、防抖跳转 |
| 13 | [弱网兜底](./13-weak-network.md) | 多处 | localStorage 草稿、轮询容错、可见性暂停、状态恢复 |
| 14 | [移动端适配](./14-mobile-adaptation.md) | 全局 | 响应式断点、底部固定栏、安全区、视口 meta |

## 阅读建议

1. **新手**：按 01 → 02 → 03 → 04 → 05 顺序阅读，建立工程骨架认知。
2. **面试准备**：重点 03（Axios 拦截器）、04（Pinia）、08（Composables）、10（选座）、11（订单）、12（错误处理）。
3. **二次开发**：先看 07（组件）、08（Composables）了解复用基建，再定位具体业务页面。
4. **联调对接**：03 + 12 + 配套文档《星幕票务-前端设计与实现文档.md》第十七章「前后端对接契约清单」。

## 技术栈速查

| 技术 | 版本 | 文档定位 |
|---|---|---|
| Vue | 3.4 | 全模块 |
| Vite | 5.2 | 01 |
| Vue Router | 4.3 | 05 |
| Pinia | 2.1 | 04 |
| Element Plus | 2.6 | 06、07 |
| Axios | 1.6 | 03 |
| TypeScript | 5.4 | 全模块 |
| Sass | 1.72 | 02 |

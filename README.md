# 星幕票务交易平台 - 前端工程

> Vue3 + Vite5 + Pinia2 + Element Plus2 + Axios1 + TypeScript5 + Sass
> 配套设计文档：`../星幕票务-前端设计与实现文档.md` v2.0
> 知识点文档：`docs/knowledge/`

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发（默认 5173 端口，自动代理 /api -> http://localhost:8080）
npm run dev

# 生产构建
npm run build

# 类型检查
npm run type-check

# 预览生产包
npm run preview
```

## 工程结构

```
frontend/
├── public/                # 静态资源
├── src/
│   ├── api/              # HTTP 层（http.ts + modules/ + types.ts）
│   ├── assets/styles/    # 设计 token + reset + 工具类
│   ├── components/       # 通用组件（base/event/order/seat）
│   ├── composables/      # 组合式函数（countdown/seatLock/orderStatus/seatPolling/request）
│   ├── directive/        # 自定义指令（permission）
│   ├── layout/           # 布局（PortalLayout/AdminLayout）
│   ├── router/           # 路由（routes/user + routes/admin + guard）
│   ├── stores/           # Pinia（user/cart/order）
│   ├── utils/            # 工具（auth/format/idempotency/seat-status/order-status/error-code）
│   ├── views/user/       # 用户端页面
│   ├── views/admin/      # 管理端页面
│   ├── views/error/      # 404
│   ├── App.vue
│   └── main.ts
├── docs/knowledge/       # 知识点说明文档（每模块一份）
├── .env.development
├── .env.production
├── package.json
├── vite.config.ts
├── tsconfig.json
├── nginx.conf
└── index.html
```

## 路由总览

### 用户端
- `/events` 演出列表
- `/events/:id` 演出详情
- `/sessions/:id` 场次详情
- `/seats/:sessionId` 在线选座 [需登录]
- `/orders/confirm` 确认订单 [需登录]
- `/orders` 我的订单 [需登录]
- `/orders/:orderNo` 订单详情 [需登录]
- `/pay/:orderNo` 收银台 [需登录]
- `/reservations` 我的预约 [需登录]
- `/profile` 个人中心 [需登录]
- `/login` 登录
- `/register` 注册

### 管理端 [需 ADMIN]
- `/admin/events` 演出管理
- `/admin/events/new` 新建演出
- `/admin/events/:id/edit` 编辑演出
- `/admin/events/:id/sessions` 场次管理
- `/admin/sessions/:id/categories` 票档管理
- `/admin/sessions/:id/seats` 座位管理
- `/admin/orders` 订单管理

## 前后端对接契约要点

1. 统一响应 `{ code:0, message, data, traceId }`，http.ts 判断 `code===0`
2. 分页 `page/size`，响应 `{ records, total, page, size }`
3. 锁座批量 `POST /seats/lock { sessionId, seatIds:[1-4] }`
4. 下单 `POST /orders` Headers `Idempotency-Key:<uuid>`
5. 支付 `POST /pay/mock/notify { orderNo, amount, payNo }`
6. JWT Header `Authorization: Bearer <token>`
7. 枚举大写下划线（UNPAID/ON_SALE）
8. 日期 `yyyy-MM-dd HH:mm:ss` 东八区

详见设计文档第十七章「前后端对接契约清单」。

## 知识点文档导航

每模块一份知识点说明，见 `docs/knowledge/`：

- [01 工程骨架与构建](./docs/knowledge/01-skeleton-and-build.md)
- [02 设计系统与样式](./docs/knowledge/02-styles-and-design-tokens.md)
- [03 HTTP 层与 API 模块](./docs/knowledge/03-http-and-api.md)
- [04 Pinia 状态管理](./docs/knowledge/04-stores.md)
- [05 路由与守卫](./docs/knowledge/05-router-and-guard.md)
- [06 布局组件](./docs/knowledge/06-layout.md)
- [07 通用组件库](./docs/knowledge/07-components.md)
- [08 组合式函数](./docs/knowledge/08-composables.md)
- [09 自定义指令](./docs/knowledge/09-directive.md)
- [10 选座模块（核心）](./docs/knowledge/10-seat-selection.md)
- [11 订单与支付](./docs/knowledge/11-order-and-payment.md)
- [12 错误处理体系](./docs/knowledge/12-error-handling.md)
- [13 弱网兜底](./docs/knowledge/13-weak-network.md)
- [14 移动端适配](./docs/knowledge/14-mobile-adaptation.md)

## 技术亮点

- 批量锁座 + 部分成功处理 + 失败回滚
- Idempotency-Key 双保险防重下单
- 30s/5s 轮询 + 可见性 API 暂停
- localStorage 观演人草稿 + 锁座恢复
- HTTP + 业务码双层错误处理 + traceId
- CSS 变量设计系统 + 暗色主题预留
- 路由懒加载 + 手动分包优化
- 响应式 Grid auto-fill 列数自适应

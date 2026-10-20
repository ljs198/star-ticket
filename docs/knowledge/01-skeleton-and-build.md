# 01 工程骨架与构建

> 涉及文件：`package.json`、`vite.config.ts`、`tsconfig.json`、`index.html`、`.env.development`、`.env.production`、`main.ts`、`App.vue`

## 一、知识点清单

### 1. Vite 5 构建工具
- **冷启动极快**：基于浏览器原生 ESM，开发期无需打包，按需编译。
- **HMR（热更新）**：修改组件瞬时生效，保留应用状态。
- **生产构建**：Rollup 打包，支持代码分割、Tree-shaking。
- 落点：`vite.config.ts` 中 `defineConfig` 配置插件、别名、代理、构建目标。

### 2. ESM 与 `<script type="module">`
- `index.html` 中以 `<script type="module" src="/src/main.ts">` 启动，浏览器原生模块加载。
- `package.json` 中 `"type": "module"` 声明 Node 侧也走 ESM。

### 3. TypeScript 5 渐进式接入
- `tsconfig.json` 配置 `strict: true`、`moduleResolution: "Bundler"`、`paths: { "@/*": ["src/*"] }`。
- `vue-tsc --noEmit` 单独做类型检查，不阻塞 Vite 构建。
- 落点：`vite.config.ts` 自身也是 TS 文件，由 `@types/node` 提供类型支持。

### 4. 路径别名 `@ -> src`
- 在 `vite.config.ts` 的 `resolve.alias` 与 `tsconfig.json` 的 `paths` 双声明。
- 业务侧 `import { orderApi } from '@/api'` 不依赖相对路径，重构无痛。
- 知识点：**Vite 别名只影响运行时**，TS 别名只影响类型检查，必须两边都配。

### 5. SCSS 全局注入
- `vite.config.ts` 的 `css.preprocessorOptions.scss.additionalData` 注入 `@use "@/assets/styles/variables.scss" as *;`。
- 所有 `.vue` 的 `<style lang="scss">` 与 `.scss` 文件可直接 `var(--color-primary)` 与 `$bp-mobile`，无需手动 import。
- 知识点：`@use` 是 SCSS 新规范（替代 `@import`），避免重复打包与全局污染。

### 6. 自动导入（unplugin-auto-import / unplugin-vue-components）
- **AutoImport**：自动导入 `vue`、`vue-router`、`pinia` 的 API（`ref/reactive/computed/useRouter`），免去手动 import。
- **Components + ElementPlusResolver**：Element Plus 组件按需引入，模板里直接写 `<el-button>` 即编译为按需引入，**减小打包体积**。
- 生成 `auto-imports.d.ts`、`components.d.ts` 类型声明（gitignore 已忽略）。
- 知识点：自动导入只对**模板/JS 上下文**生效；`ElMessage`、`ElMessageBox` 这类**函数式 API** 仍需显式 import。

### 7. 环境变量
- `.env.development` / `.env.production` 用 `VITE_` 前缀，业务侧通过 `import.meta.env.VITE_API_BASE_URL` 读取。
- 开发环境 `VITE_API_BASE_URL` 指向后端地址，供 `vite.config.ts` 的 `proxy` 使用。
- 知识点：Vite 把 `.env` 注入 `import.meta.env`，**只有 `VITE_` 前缀变量会暴露给客户端**，避免泄露密钥。

### 8. 开发代理（dev proxy）
- `server.proxy['/api']` 把前端 `/api/*` 请求转发到 `VITE_API_BASE_URL`，`rewrite` 去掉 `/api` 前缀。
- 业务代码统一写 `/api/xxx`，**规避浏览器同源策略**，无需后端配 CORS。
- 生产环境改由 nginx 反向代理（见 `nginx.conf`）。

### 9. 手动分包（manualChunks）
- `build.rollupOptions.output.manualChunks` 把 `vue/vue-router/pinia` 与 `element-plus` 拆出独立 chunk。
- 长期缓存友好：业务代码变化时，框架 chunk 不变，CDN 命中率高。

### 10. 应用入口 main.ts
- `createApp(App)` 创建应用实例。
- **挂载顺序**：`app.use(pinia)` 先于 `app.use(router)`，因为路由守卫中会读取 `useUserStore()`，**Pinia 必须先注册**。
- 全局样式入口 `import '@/assets/styles/index.scss'` 只在入口引入一次。
- 知识点：Vue3 的 `app.use(plugin)` 注册插件实例，多次调用同一插件会被去重。

### 11. 根组件 App.vue
- `<script setup lang="ts">` + `<el-config-provider :locale="zhCn">` 配置 Element Plus 中文。
- `userStore.bootstrap()` 在根组件启动时从 localStorage 恢复登录态，**保证路由守卫第一次执行时 token 已就位**。

## 二、面试常见追问

**Q：为什么用 Vite 而不是 webpack？**
A：开发体验（ESM 冷启动秒开 vs bundle 全量构建）+ 生产构建同样用 Rollup 优化。中小型项目 Vite 全面胜出。

**Q：自动导入会不会让代码不可读？**
A：会牺牲一点显式性，但配合 `auto-imports.d.ts` 类型提示，IDE 体验无损。**函数式 API（ElMessage）仍显式 import** 是关键约束。

**Q：`@` 别名为什么要在两处声明？**
A：Vite 别名只影响运行时打包，TS 别名只影响类型检查。**漏配任何一处**都会报错（运行时 404 或类型检查 unresolved）。

## 三、文件落点速查

| 知识点 | 文件 | 关键行 |
|---|---|---|
| ESM 入口 | `index.html` | `<script type="module">` |
| TS 配置 | `tsconfig.json` | `paths.@/*` |
| SCSS 注入 | `vite.config.ts` | `css.preprocessorOptions.scss.additionalData` |
| 代理 | `vite.config.ts` | `server.proxy['/api']` |
| Pinia 先于 router | `main.ts` | `app.use(pinia); app.use(router)` |

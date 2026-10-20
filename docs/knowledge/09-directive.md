# 09 自定义指令

> 涉及文件：`directive/permission.ts`、`directive/index.ts`

## 一、知识点清单

### 1. Vue3 自定义指令（Directive）
- 指令是**扩展原生 HTML 元素行为**的机制，命名 `v-xxx`。
- 全局注册：`app.directive('permission', permission)`；局部注册：`directives: { permission }`。
- 落点：本项目 `v-permission="'admin'"` 控制按钮显示。

### 2. 指令钩子（mounted/updated/unmounted）
```ts
const permission: Directive<HTMLElement, PermissionValue> = {
  mounted(el, binding) {
    if (!hasPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  }
}
```
- `mounted`：元素挂载到 DOM 后触发，可访问 el。
- `binding.value`：指令绑定的值，如 `v-permission="'admin'"` 的 `'admin'`。
- 知识点：Vue3 钩子命名与组件生命周期对齐（mounted/updated/unmounted），比 Vue2 的 bind/inserted/update 更清晰。

### 3. 权限判断逻辑
```ts
function hasPermission(required: PermissionValue): boolean {
  const userStore = useUserStore()
  const role = userStore.role.toUpperCase()
  if (Array.isArray(required)) {
    return required.some((r) => r.toUpperCase() === role)
  }
  return required.toUpperCase() === role
}
```
- 支持单角色 `v-permission="'admin'"` 与多角色 `v-permission="['admin','editor']"`。
- 知识点：**指令内可访问 Pinia store**（只要 Pinia 已注册）。

### 4. DOM 移除策略
- `el.parentNode?.removeChild(el)` 彻底从 DOM 移除，比 `v-if` 更声明式。
- 知识点：**指令在 mounted 触发**，元素已渲染到 DOM，移除是 DOM 操作；v-if 在 render 阶段控制，**指令更声明式**，业务侧无需关心。

### 5. 与 v-if 的取舍
| 方式 | 优点 | 缺点 |
|---|---|---|
| v-permission 指令 | 声明式，业务侧一行 | 元素先渲染再移除（瞬时存在） |
| v-if + computed | 渲染前控制 | 每处都要写 computed |

- 本项目选指令：**权限控制点分散时更省代码**，瞬时渲染对体验无影响（移除极快）。

### 6. 使用示例
```vue
<el-button v-permission="'admin'" @click="goAdmin">管理后台</el-button>
<el-button v-permission="['admin','operator']" @click="exportData">导出</el-button>
```

### 7. 局限性
- 指令在 mounted 触发，**SSR 场景无 parentNode**，需用 `v-if` 替代。
- 指令不能阻止 render，元素瞬时存在（但对用户视觉无感）。
- 知识点：本项目是 SPA，无 SSR，指令方案适用。

### 8. 注册方式
- 局部注册（推荐）：`import { permission } from '@/directive'; const vPermission = directives: { permission }`，或在 `<script setup>` 中直接命名 `vPermission` 变量。
- 全局注册：`app.directive('permission', permission)` 在 main.ts 注册。
- 知识点：`<script setup>` 中任何 `vXxx` 命名的变量自动作为 `v-xxx` 指令可用。

## 二、应用场景

| 场景 | 指令 | 作用 |
|---|---|---|
| 按钮权限 | v-permission | 角色不符移除按钮 |
| 输入自动聚焦 | v-focus | mounted 时 el.focus() |
| 滚动加载 | v-scroll | 监听滚动触底 |
| 权限点 | v-permission | 升级为权限点列表（如 'order:create'） |

本项目只实现 v-permission，其余按需扩展。

## 三、面试常见追问

**Q：指令和 v-if 哪个更好？**
A：**v-if 更纯粹**（渲染前控制），但分散权限点写 computed 繁琐；**指令更声明式**，业务侧一行。权限点分散选指令，集中用 v-if。

**Q：指令能在 SSR 用吗？**
A：mounted 钩子在 SSR 不触发，**SSR 场景用 v-if 替代**或用 `bind` 钩子（但仍需处理 hydration）。本项目 SPA 无此问题。

**Q：为什么不用 v-if + role 判断？**
A：可以，但每处按钮都写 `v-if="userStore.role === 'ADMIN'"` 重复且易漏。**指令封装复用**，业务侧只声明所需角色。

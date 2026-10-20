# 02 设计系统与样式

> 涉及文件：`assets/styles/variables.scss`、`reset.scss`、`index.scss`

## 一、知识点清单

### 1. CSS 变量（Custom Properties）
- 以 `--color-primary: #4B3FE3` 声明，业务侧 `var(--color-primary)` 引用。
- **运行时可改**：JS 可 `document.documentElement.style.setProperty('--color-primary', ...)` 切主题。
- 浏览器原生支持，无构建成本，未来切换暗色主题只需覆盖 `:root[data-widget-theme="dark"]`。
- 落点：`variables.scss` 中所有颜色、尺寸、阴影均用 CSS 变量声明。

### 2. SCSS 变量 vs CSS 变量
| 特性 | SCSS `$var` | CSS `--var` |
|---|---|---|
| 求值时机 | 编译期 | 运行时 |
| 能否在 JS 改 | 否 | 是 |
| 用于 @media | 是（编译期算） | 否（CSS 变量不能直接进 media query） |
| 适合 | 断点、mixin 计算 | 主题色、运行时主题 |

本项目用 `$bp-mobile` 编译期断点，用 `--color-*` 运行时主题，**互补**。

### 3. 设计 Token（Design Token）
- 把品牌色、座位色、间距、圆角、阴影统一抽象成命名 token。
- 业务组件**不写硬编码色值**，全部 `var(--color-xxx)`，换肤集中改 `variables.scss`。
- 座位状态色按**语义命名**（`--color-seat-available` 而非 `--color-green`），状态机改色不改业务。

### 4. 全局重置（reset.scss）
- `box-sizing: border-box` 统一盒模型，避免 padding 撑大元素。
- body 字体族、`-webkit-font-smoothing` 抗锯齿。
- `img { display: block }` 避免行内基线空隙。
- 滚动条美化（仅 Webkit 内核，Firefox 用 `scrollbar-width`）。
- 知识点：**reset 是基线**，组件级样式写在 `.vue` 的 `<style scoped>`，不在全局。

### 5. 工具类（index.scss）
- `.flex-1`、`.text-ellipsis`、`.text-ellipsis-2`、`.card`、`.bottom-bar`、`.safe-area-bottom` 等高频复用类。
- 知识点：**工具类只放最通用的原子**，业务样式仍在 scoped style 中写，避免全局污染。

### 6. 文本省略（line-clamp）
- 单行：`overflow:hidden; text-overflow:ellipsis; white-space:nowrap`。
- 两行：`display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden`。
- 兼容性：现代浏览器全支持，无需 polyfill。

### 7. 底部固定栏 `.bottom-bar`
- `position: fixed; left:0; right:0; bottom:0`，避开文档流。
- 配合 `.safe-area-bottom` 适配 iPhone 底部安全区。

### 8. 暗色主题预留
- `:root[data-widget-theme="dark"]` 覆盖 token，业务组件零改动即可切暗色。
- 本工程未启用暗色，但保留接入点。

## 二、Element Plus 主题覆盖
- `variables.scss` 末尾用 `--el-color-primary` 系列覆盖 Element Plus 主色为品牌紫 `#4B3FE3`。
- 知识点：Element Plus 2.x 用 CSS 变量定制主题，**无需重新编译 SCSS**，比 1.x 的主题生成器轻量。

## 三、SCSS 全局注入原理
- `vite.config.ts` 的 `additionalData` 在每个 `.scss` 文件前自动拼接 `@use "@/assets/styles/variables.scss" as *`。
- 知识点：`@use ... as *` 把模块所有成员引入当前作用域，**不会重复打包**（SCSS 模块系统去重）。

## 四、文件职责分层

| 文件 | 职责 | 引入时机 |
|---|---|---|
| `variables.scss` | Token 定义、Element Plus 覆盖 | 全局自动注入 |
| `reset.scss` | 全局重置 | 由 `index.scss` `@use` |
| `index.scss` | 工具类、入口 | 由 `main.ts` 一次性引入 |

## 五、面试常见追问

**Q：为什么不全用 SCSS 变量？**
A：SCSS 变量编译期固定，运行时无法切换主题。**运行时主题**需求必须用 CSS 变量。

**Q：工具类和 Tailwind 怎么选？**
A：本项目业务样式偏组件化，少量工具类足够；Tailwind 适合 UI 自由度高的项目，但会引入额外学习成本。

**Q：`@use` 比 `@import` 强在哪？**
A：`@import` 已废弃（被 SCSS 团队明确弃用），`@use` 提供模块化命名空间、避免重复加载与全局污染。

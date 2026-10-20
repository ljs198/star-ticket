# 06 布局组件

> 涉及文件：`layout/PortalLayout.vue`、`layout/AdminLayout.vue`

## 一、知识点清单

### 1. el-container 布局栅格
- `el-container` + `el-aside` + `el-header` + `el-main` 是 Element Plus 的布局组件。
- `PortalLayout` 用 header + main 两段式；`AdminLayout` 用 aside + (header + main) 三段式。
- 知识点：el-container 自带 flex 布局，方向自动（vertical 默认，horizontal 当有 aside）。

### 2. el-menu 路由模式
- `<el-menu router :default-active="activeMenu">` 开启 router 模式，点击 menu-item 直接 `router.push(index)`。
- `default-active` 绑定当前路由 path，**自动高亮**当前菜单项。
- 知识点：menu-item 的 `index` 即目标路径，无需 @click 手动跳转。

### 3. 当前路由高亮计算
```ts
const activeMenu = computed(() => '/' + (route.path.split('/')[1] || ''))
```
- 取路由第一段（如 `/orders/123` -> `/orders`），匹配 menu-item 的 index。
- 知识点：**列表页与详情页共享同一菜单高亮**，提升一致性。

### 4. 登录态分支渲染
- `v-if="isLogin"` 显示昵称下拉 + 管理后台入口；`v-else` 显示登录按钮。
- `el-dropdown` 下拉菜单：个人中心 / 退出登录。
- 知识点：布局组件读 `userStore`，登录态变化**自动响应**（响应式 store）。

### 5. 管理端侧边栏折叠
- `isCollapse = ref(false)` 控制折叠状态。
- `el-aside :width="isCollapse ? '64px' : '220px'"` 响应式宽度。
- `el-menu :collapse="isCollapse"` 菜单折叠为图标。
- 知识点：折叠状态可存 localStorage，刷新保持。

### 6. 嵌套路由出口 `<router-view />`
- 布局组件内 `<router-view />` 是子路由的渲染出口。
- 知识点：**父布局不重新渲染**，切换子路由只更新出口内容，提升体验。

### 7. 返回前台链接
- AdminLayout 顶部 `router-link to="/events"` 切换回用户端。
- 知识点：管理端与用户端共用同一 Vue 应用，**靠路由区分**，不拆独立工程。

### 8. 移动端适配
- PortalLayout 在 `$bp-mobile` 断点隐藏导航菜单（`@media { .portal-menu { display: none } }`）。
- 知识点：C 端移动端导航简化为顶部 logo + 登录按钮，避免横向滚动。

### 9. 吸顶 header
- `position: sticky; top: 0` 让 header 滚动时吸顶。
- 知识点：sticky 比 fixed 更自然，**不脱离文档流**，无需 padding 补偿。

### 10. 退出登录流程
```ts
async function handleLogout() {
  await userStore.logout()  // 调后端 logout + 清 store
  router.push('/events')
}
```
- 知识点：logout 内部 try/catch 后端失败仍清前端态，**保证用户能退出**。

## 二、两个布局对比

| 特性 | PortalLayout | AdminLayout |
|---|---|---|
| 结构 | header + main | aside + (header + main) |
| 菜单 | 顶部水平 menu | 左侧垂直 menu（可折叠） |
| 宽度 | max-width 1200px 居中 | 全屏，aside 固定宽 |
| 主题 | 浅色 | 深色 aside（#001529） |
| 移动端 | 隐藏菜单 | 桌面优先 |

## 三、面试常见追问

**Q：为什么管理端不拆独立工程？**
A：共用 api/stores/components，**复用度高**；拆工程要解决登录态共享、构建配置重复。中小项目单工程更划算。

**Q：sticky 和 fixed 区别？**
A：sticky 在视口内保持流式，**不脱离文档流**；fixed 脱离文档流需补偿 padding。header 用 sticky 更省心。

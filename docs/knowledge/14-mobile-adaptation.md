# 14 移动端适配

> 涉及文件：`assets/styles/variables.scss`、`assets/styles/index.scss`、`index.html`、各组件 scoped style

## 一、知识点清单

### 1. 视口 meta（index.html）
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```
- `width=device-width`：视口宽度等于设备宽度。
- `initial-scale=1.0`：初始缩放 1。
- `maximum-scale=1.0, user-scalable=no`：禁止用户缩放（票务场景需精确点击座位）。
- 知识点：**移动端必须配 viewport meta**，否则默认视口 980px 导致字体过小。

### 2. 响应式断点
```scss
$bp-desktop: 1200px;
$bp-tablet: 768px;
$bp-mobile: 480px;
```
- 桌面优先（C 端以桌面为主），移动端可用但不精致。
- 知识点：**断点是 SCSS 变量**，`@media (max-width: $bp-mobile)` 复用。

### 3. 媒体查询适配
```scss
@media (max-width: $bp-mobile) {
  .portal-menu { display: none; }
  .filter-item, .keyword { width: 100%; }
}
```
- 移动端隐藏顶部导航菜单（C 端简化为 logo + 登录按钮）。
- 筛选条宽度 100%，避免横向滚动。
- 知识点：**移动端简化 UI**，避免横向滚动与点击误触。

### 4. 底部固定操作栏
```scss
.bottom-bar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: var(--bottom-bar-height);
  box-shadow: var(--shadow-bottom-bar);
}
```
- 选座页底部"已选座位 + 总价 + 确认选座"按钮，**触手可及**。
- 知识点：**sticky bottom bar 是移动端票务标配**，操作不滚动到视野外。

### 5. 安全区适配（iPhone 底部）
```scss
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);  /* iOS < 11.2 */
  padding-bottom: env(safe-area-inset-bottom);        /* iOS >= 11.2 */
}
```
- iPhone X+ 底部有 home indicator，固定栏需加安全区 padding。
- 知识点：**constant() 是旧语法，env() 是新语法**，两个都写兼容旧 iOS。

### 6. 触摸优化
- 座位尺寸 28x28px，**大于 44px 触摸目标稍小**，但票务场景需密度（一屏多座位）。
- 按钮 padding 适当增大，减少误触。
- 知识点：**触摸目标建议 44x44px**（Apple HIG），但密集场景可适当缩小。

### 7. 横向滚动（座位行）
```scss
.seat-list {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
}
```
- 一行座位过多时横向滚动，不挤压。
- 知识点：**横向滚动是密集列表的折中**，比换行更符合剧院座位布局。

### 8. 弹性布局
- 列表用 CSS Grid 自适应列数：
```scss
.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
```
- 桌面 4 列，平板 2 列，手机 1 列，**无需 media query**。
- 知识点：**auto-fill + minmax** 是响应式 Grid 的利器，列数随容器宽度自动调整。

### 9. 字体大小
- body 默认 14px，移动端可读。
- 标题 16-22px，正文 12-14px，**不小于 11px**。
- 知识点：**移动端字体下限 11px**，再小不可读。

### 10. 触摸反馈
```scss
.seat-item:hover:not(.not-clickable) {
  transform: scale(1.1);
  box-shadow: 0 0 0 2px var(--seat-color);
}
```
- hover 放大 + 阴影，桌面端视觉反馈。
- 移动端无 hover，但 active 状态可加 `:active` 样式。
- 知识点：**移动端用 :active 替代 :hover**，触摸时即时反馈。

### 11. 图片自适应
```scss
img {
  max-width: 100%;
  height: auto;
}
```
- 图片不超出容器，等比缩放。
- 知识点：**reset 中统一处理**，避免单张图片撑破布局。

### 12. 主题色适配
- `meta name="theme-color"` 设置浏览器地址栏颜色为品牌紫。
- 知识点：**移动端浏览器地址栏配色**，提升品牌一致性。

## 二、断点适配矩阵

| 断点 | 宽度 | 适配内容 |
|---|---|---|
| desktop | > 1200px | 4 列卡片，完整导航 |
| tablet | 768-1200px | 2-3 列卡片，完整导航 |
| mobile | < 480px | 1 列卡片，隐藏导航，底部固定栏 |

## 三、移动端 vs 桌面端

| 特性 | 桌面端 | 移动端 |
|---|---|---|
| 布局 | 多列网格 | 单列 |
| 导航 | 顶部水平 menu | 隐藏（或抽屉） |
| 操作栏 | 内嵌按钮 | 底部固定栏 |
| 座位 | 鼠标 hover | 触摸 :active |
| 字体 | 14px | 14px（不缩） |

## 四、面试常见追问

**Q：为什么移动端不精致？**
A：PRD v2.0 定位**桌面为主，移动端可用**。完整移动端需独立设计（手势/抽屉/底部 tab），成本高；当前方案保证**可用**，不追求精致。

**Q：禁止缩放合理吗？**
A：票务选座需精确点击座位，**禁止缩放避免误触**放大后点错座位。但可访问性场景（视障用户）需允许缩放，本项目业务优先。

**Q：CSS Grid auto-fill 怎么工作？**
A：`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`，浏览器自动计算容器能放几个 240px 列，**列数随宽度自适应**，无需 media query。

**Q：安全区是什么？**
A：iPhone X+ 底部有 home indicator（横条），固定栏需避开。`env(safe-area-inset-bottom)` 返回安全区高度，加 padding 避开。

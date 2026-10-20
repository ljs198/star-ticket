# 07 通用组件库

> 涉及文件：`components/base/*`、`components/event/*`、`components/order/*`、`components/seat/*`、`components/index.ts`

## 一、知识点清单

### 1. 二次封装 el-button（BaseButton）
- 包装 Element Plus 的 el-button，统一默认 `type=primary`，`disabled` 与 `loading` 联动防重复点击。
- props 用 `withDefaults(defineProps<Props>(), {...})` 设默认值。
- 知识点：**二次封装统一设计规范**，业务侧少传配置，未来换主题只改一处。

### 2. props 透传（$attrs）
- BaseButton 的 props 只显式声明需要的字段，其余通过 `$attrs` 自动透传到内部 el-button。
- Vue3 中**多根节点组件必须用 `v-bind="$attrs"` 显式绑定**，单根自动继承。

### 3. 列驱动表格（BaseTable）
- `columns` 数组定义列（prop/label/width/slot），模板 v-for 渲染 el-table-column。
- **插槽列**：`slot` 字段标记自定义渲染，业务侧 `<template #status="{ row }">` 接收。
- 知识点：列驱动让表格声明式配置，**减少模板重复**，新增列只改数组。

### 4. 作用域插槽
```vue
<el-table-column>
  <template #default="scope">
    <slot :name="col.slot" :row="scope.row" :index="scope.$index" />
  </template>
</el-table-column>
```
- el-table 默认插槽暴露 `{ row, $index, column }`，BaseTable 转发给业务侧具名插槽。
- 知识点：**作用域插槽是数据下传模板上传**的核心机制，让 BaseTable 可扩展。

### 5. v-model 双向绑定（BaseDialog / BasePagination）
- BaseDialog `modelValue` + `update:modelValue` 实现 `v-model` 语法糖。
- BasePagination `page` + `update:page` 实现 `v-model:page`（Vue3 命名 v-model）。
- 知识点：Vue3 用 `v-model:arg` 支持多个双向绑定，比 Vue2 的 `.sync` 更清晰。

### 6. 关闭前确认（BaseDialog.beforeClose）
```ts
async function handleClose() {
  if (props.beforeClose) {
    const ok = await props.beforeClose()
    if (!ok) return  // 表单脏则阻止关闭
  }
  emit('update:modelValue', false)
}
```
- 知识点：**表单未保存关闭前弹确认**是 PRD v2.0 第 17 条要求，封装进 BaseDialog 复用。

### 7. 演出卡片（EventCard）
- 卡片布局：海报 + 标题 + 时间 + 场馆 + 价格 + 状态 tag。
- `@click="goDetail"` 跳详情，整卡可点。
- 价格区间：`formatMoneyWithSymbol(minPrice)`，后端返分，前端展示元。
- 状态映射：`ON_SALE/SOLD_OUT/END` -> tag type。
- 知识点：**卡片是列表项的封装**，列表页 v-for 渲染卡片，数据驱动 UI。

### 8. 筛选条防抖（EventFilter）
- 关键词输入用 `watch + setTimeout` 防抖 300ms，避免每个字符触发请求。
- 城市下拉、分类下拉、状态下拉用 el-select，`@update:model-value` 向上 emit。
- 知识点：**防抖是性能优化基础**，减少无效请求。

### 9. 订单状态标签（OrderStatusTag）
- 复用 `utils/order-status.ts` 的 `getOrderStatusMeta(status)`，文案与配色集中维护。
- 知识点：**UI 组件不持有业务逻辑**，状态映射放 utils，组件只渲染。

### 10. 支付倒计时（PayCountdown）
- 复用 `useCountdown` composable，传入 `expireTime`，归零 emit `expire`。
- `< 60s` 显示红色 + blink 动画警示。
- 知识点：**UI 组件与逻辑分离**，倒计时逻辑 composable 化，PayCountdown 只负责展示。

### 11. 座位组件层级（SeatMap -> SeatArea -> SeatRow -> SeatItem）
- 四层组件拆分：SeatMap 渲染多区域，SeatArea 按 row 分组，SeatRow 渲染一行，SeatItem 单个座位。
- 数据自上而下（props），事件自下而上（emit select）。
- 知识点：**复杂 UI 拆层级**，每层职责单一，复用与测试都容易。

### 12. 座位状态映射（SeatItem）
```ts
const style = computed(() => getSeatStyle(props.seat.status, isMine.value))
```
- `getSeatStyle` 来自 `utils/seat-status.ts`，返回 `{ label, color, hoverable }`。
- `isMine` 判断：`seat.status === LOCKED && seat.lockUserId === currentUserId`。
- 知识点：LOCKED 状态需**按 lockUserId 二次区分**，前端通过 props 传入 currentUserId。

### 13. 可点击性判断
```ts
const clickable = computed(() => {
  if (status === SOLD || status === DISABLED) return false
  if (status === LOCKED && !isMine) return false
  if (status === AVAILABLE && disabled && !selected) return false  // 达上限
  return true
})
```
- 已售/禁用/他人锁定：不可点。
- 达上限的 AVAILABLE：不可点（除非已选）。
- 知识点：**业务规则集中在 computed**，模板只 `:disabled="!clickable"`。

### 14. scoped 样式 + CSS 变量
- `<style scoped lang="scss">` 作用域隔离，避免全局污染。
- 颜色用 `var(--seat-color)`，由 `:style="{ '--seat-color': style.color }"` 动态注入。
- 知识点：**inline style 注入 CSS 变量**，让 scoped 样式也能动态配色。

## 二、组件树

```
BaseButton / BaseTable / BaseDialog / BasePagination   (通用基建)
EventCard / EventFilter                                (演出域)
OrderStatusTag / PayCountdown                          (订单域)
SeatMap > SeatArea > SeatRow > SeatItem                (座位域，四层)
```

## 三、复用设计原则

1. **业务逻辑放 utils/composables**，组件只渲染。
2. **状态映射集中维护**（order-status.ts / seat-status.ts），改文案不改组件。
3. **props 单向下传，emit 单向上传**，单向数据流可追溯。
4. **二次封装统一设计规范**，业务侧少写配置。

## 四、面试常见追问

**Q：作用域插槽怎么用？**
A：父组件 `<template #slotName="{ row, index }">`，子组件 `<slot :row="data" :index="i" name="slotName" />`。数据子传父，模板父定义。

**Q：座位组件为什么拆四层？**
A：职责分离 - SeatMap 渲染多区域 + 图例，SeatArea 按 row 分组，SeatRow 渲染行 + 行号，SeatItem 单个座位状态。**每层单一职责**，复用与测试容易。

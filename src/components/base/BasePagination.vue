<!--
  通用分页（components/base/BasePagination.vue）
  知识点：
  1. PRD v2.0 分页约定：page/size 请求，{ records, total, page, size } 响应
  2. el-pagination 的 current-page / page-size 双向绑定
  3. size-change 与 current-change 分别触发，统一向上 emit change
  4. layout：sizes + prev + pager + next + total
-->
<script setup lang="ts">
import { ElPagination } from 'element-plus'

interface Props {
  total: number
  page: number
  size: number
  pageSizes?: number[]
  layout?: string
}

const props = withDefaults(defineProps<Props>(), {
  pageSizes: () => [10, 20, 50, 100],
  layout: 'total, sizes, prev, pager, next, jumper'
})

const emit = defineEmits<{
  (e: 'update:page', val: number): void
  (e: 'update:size', val: number): void
  (e: 'change'): void
}>()

function handleCurrentChange(val: number) {
  emit('update:page', val)
  emit('change')
}

function handleSizeChange(val: number) {
  emit('update:size', val)
  emit('update:page', 1)
  emit('change')
}
</script>

<template>
  <div class="base-pagination">
    <el-pagination
      :current-page="props.page"
      :page-size="props.size"
      :total="props.total"
      :page-sizes="props.pageSizes"
      :layout="props.layout"
      background
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>

<style scoped lang="scss">
.base-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

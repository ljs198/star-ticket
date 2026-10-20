<!--
  通用表格（components/base/BaseTable.vue）
  知识点：
  1. 封装 el-table：列定义数组驱动，避免模板重复
  2. 列插槽：通过 #default 自定义渲染（如状态标签、操作按钮）
  3. 空状态：el-table 自带 empty-text
  4. loading：传入 loading 控制加载态
  5. selection：可开启多选（管理端批量操作）
-->
<script setup lang="ts" generic="T extends Record<string, unknown>">
import { ref } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus'
import type { TableInstance } from 'element-plus'

interface Column {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: 'left' | 'right' | boolean
  align?: 'left' | 'center' | 'right'
  /** 插槽名，用于自定义渲染 */
  slot?: string
  /** 是否显示 tooltip */
  showOverflowTooltip?: boolean
}

interface Props {
  data: T[]
  columns: Column[]
  loading?: boolean
  emptyText?: string
  selectable?: boolean
  rowKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyText: '暂无数据',
  selectable: false,
  rowKey: 'id'
})

const emit = defineEmits<{
  (e: 'selection-change', selection: T[]): void
}>()

// 用 ref 持有 el-table 实例，供父组件调用 clearSelection/toggleRowSelection 等方法
const tableRef = ref<TableInstance | null>(null)
defineExpose({ tableRef })
</script>

<template>
  <el-table
    ref="tableRef"
    :data="props.data"
    v-loading="props.loading"
    :empty-text="props.emptyText"
    :row-key="props.rowKey"
    style="width: 100%"
    @selection-change="(val: T[]) => emit('selection-change', val)"
  >
    <el-table-column v-if="props.selectable" type="selection" width="48" />
    <el-table-column
      v-for="col in props.columns"
      :key="col.prop"
      :prop="col.prop"
      :label="col.label"
      :width="col.width"
      :min-width="col.minWidth"
      :fixed="col.fixed"
      :align="col.align ?? 'left'"
      :show-overflow-tooltip="col.showOverflowTooltip ?? true"
    >
      <template v-if="col.slot" #default="scope">
        <slot :name="col.slot" :row="scope.row" :index="scope.$index" />
      </template>
    </el-table-column>
  </el-table>
</template>

<!--
  座位区域（components/seat/SeatArea.vue）
  知识点：
  1. 一个区域含若干行：area 内按 row 字段分组
  2. 区域标题 + 图例（颜色含义说明）
  3. 横向滚动：行内座位过多时支持滚动
  4. props：area 数据 + 当前用户 ID + 已选 ID + disabled
-->
<script setup lang="ts">
import { computed } from 'vue'
import SeatRow from './SeatRow.vue'
import type { Seat } from '@/api/types'

interface Props {
  areaName: string
  seats: Seat[]
  currentUserId?: number
  currentCategoryId?: number
  selectedIds: number[]
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', seat: Seat): void
}>()

/** 按 row 分组 */
const groupedRows = computed(() => {
  const map = new Map<string, Seat[]>()
  for (const seat of props.seats) {
    const arr = map.get(seat.row) ?? []
    arr.push(seat)
    map.set(seat.row, arr)
  }
  // 按 row 字母顺序排序
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})
</script>

<template>
  <div class="seat-area">
    <h4 class="area-title">{{ props.areaName }}</h4>
    <div class="area-body">
      <SeatRow
        v-for="[row, seats] in groupedRows"
        :key="row"
        :row-label="row"
        :seats="seats"
        :current-user-id="props.currentUserId"
        :current-category-id="props.currentCategoryId"
        :selected-ids="props.selectedIds"
        :disabled="props.disabled"
        @select="(s) => emit('select', s)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.seat-area {
  margin-bottom: 24px;
}
.area-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary);
}
.area-body {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}
</style>

<!--
  座位行（components/seat/SeatRow.vue）
  知识点：
  1. 一个 row 含若干 SeatItem
  2. 左侧显示行号（A/B/C）
  3. props：seats 数组 + 透传给 SeatItem 的状态参数
-->
<script setup lang="ts">
import SeatItem from './SeatItem.vue'
import type { Seat } from '@/api/types'

interface Props {
  rowLabel: string
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
</script>

<template>
  <div class="seat-row">
    <span class="row-label">{{ props.rowLabel }}</span>
    <div class="seat-list">
      <SeatItem
        v-for="seat in props.seats"
        :key="seat.id"
        :seat="seat"
        :current-user-id="props.currentUserId"
        :current-category-id="props.currentCategoryId"
        :selected="props.selectedIds.includes(seat.id)"
        :disabled="props.disabled"
        @select="(s) => emit('select', s)"
      />
    </div>
    <span class="row-label">{{ props.rowLabel }}</span>
  </div>
</template>

<style scoped lang="scss">
.seat-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.row-label {
  width: 24px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.seat-list {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding: 2px 0;
}
</style>

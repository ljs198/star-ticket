<!--
  座位图（components/seat/SeatMap.vue）
  知识点：
  1. 顶层容器：渲染多个 SeatArea
  2. 图例区：显示颜色含义
  3. 舞台方向指示（"舞台 STAGE"文字标识）
  4. props：areas 数组 + 当前用户 ID + 已选 ID + disabled
  5. emit select 向上冒泡
-->
<script setup lang="ts">
import SeatArea from './SeatArea.vue'
import type { SeatArea as SeatAreaType } from '@/api/types'

interface Props {
  areas: SeatAreaType[]
  currentUserId?: number
  currentCategoryId?: number
  selectedIds: number[]
  disabled?: boolean
  /** 是否显示舞台标识 */
  showStage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStage: true
})

const emit = defineEmits<{
  (e: 'select', seat: import('@/api/types').Seat): void
}>()

const legend = [
  { color: 'var(--color-seat-available)', label: '可售' },
  { color: 'var(--color-seat-locked-me)', label: '我锁的' },
  { color: 'var(--color-seat-locked-other)', label: '他人锁定' },
  { color: 'var(--color-seat-sold)', label: '已售' },
  { color: 'var(--color-seat-disabled)', label: '禁用' }
]
</script>

<template>
  <div class="seat-map">
    <div v-if="props.showStage" class="stage">舞台 STAGE</div>
    <div class="legend">
      <span v-for="item in legend" :key="item.label" class="legend-item">
        <span class="legend-color" :style="{ background: item.color }"></span>
        {{ item.label }}
      </span>
    </div>
    <div v-if="!props.areas.length" class="empty">暂无座位数据</div>
    <SeatArea
      v-for="area in props.areas"
      :key="area.area"
      :area-name="area.area"
      :seats="area.seats"
      :current-user-id="props.currentUserId"
      :current-category-id="props.currentCategoryId"
      :selected-ids="props.selectedIds"
      :disabled="props.disabled"
      @select="(s) => emit('select', s)"
    />
  </div>
</template>

<style scoped lang="scss">
.seat-map {
  padding: 16px 8px;
  background: var(--color-bg-muted);
  border-radius: var(--radius-card);
}
.stage {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
  padding: 12px;
  margin: 0 auto 16px;
  width: 60%;
  border-bottom: 2px solid var(--color-text-placeholder);
  letter-spacing: 4px;
}
.legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.legend-color {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
}
.empty {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-placeholder);
}

/* ========== 移动端 ========== */
@media (max-width: $bp-tablet) {
  .seat-map {
    padding: 10px 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .stage {
    font-size: 12px;
    padding: 8px;
    width: 80%;
  }
  .legend {
    gap: 8px;
    margin-bottom: 10px;
  }
  .legend-item { font-size: 11px; }
  .legend-color { width: 12px; height: 12px; }
}
</style>

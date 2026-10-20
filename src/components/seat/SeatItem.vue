<!--
  单个座位（components/seat/SeatItem.vue）
  知识点：
  1. 座位状态映射（utils/seat-status.ts）：AVAILABLE/LOCKED/SOLD/DISABLED
  2. LOCKED 需按 lockUserId 二次区分：我锁的 / 他人锁定
  3. 点击逻辑：仅 AVAILABLE 与"我锁的 LOCKED"可点击
  4. 选中态：UI 高亮表示已加入购物车
  5. 限购达上限后 AVAILABLE 座位置灰不可点
  6. 颜色全部引用 CSS 变量，便于换肤
-->
<script setup lang="ts">
import { computed } from 'vue'
import { getSeatStyle, SeatStatus, type SeatLockFailReason } from '@/utils/seat-status'
import type { Seat } from '@/api/types'

interface Props {
  seat: Seat
  /** 当前登录用户 ID（用于判断 LOCKED 是否为"我锁的"） */
  currentUserId?: number
  /** 当前票档 ID（非当前票档的座位变暗，点击切换票档） */
  currentCategoryId?: number
  /** 是否已选入购物车 */
  selected?: boolean
  /** 是否已达限购上限（AVAILABLE 置灰） */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  disabled: false
})

const emit = defineEmits<{
  (e: 'select', seat: Seat): void
}>()

const isMine = computed(() => {
  return (
    props.seat.status === SeatStatus.LOCKED &&
    props.seat.lockUserId != null &&
    props.seat.lockUserId === props.currentUserId
  )
})

const style = computed(() => getSeatStyle(props.seat.status, isMine.value))

/** 是否为非当前票档的座位（变暗，点击可切换票档） */
const isDimmed = computed(
  () => props.currentCategoryId != null && props.seat.categoryId !== props.currentCategoryId
)

const clickable = computed(() => {
  if (props.seat.status === SeatStatus.SOLD || props.seat.status === SeatStatus.DISABLED) return false
  if (props.seat.status === SeatStatus.LOCKED && !isMine.value) return false
  // 非当前票档座位：AVAILABLE 或我锁的可点击（用于切换票档 + 选座）
  if (isDimmed.value) {
    return props.seat.status === SeatStatus.AVAILABLE || isMine.value
  }
  // 当前票档：AVAILABLE 但达上限
  if (props.seat.status === SeatStatus.AVAILABLE && props.disabled && !props.selected) return false
  return true
})

function handleClick() {
  if (!clickable.value) return
  emit('select', props.seat)
}
</script>

<template>
  <button
    class="seat-item"
    :class="{
      selected: props.selected,
      'not-clickable': !clickable,
      'is-mine': isMine,
      'is-disabled-seat': props.seat.status === SeatStatus.DISABLED,
      'is-dimmed': isDimmed
    }"
    :style="{ '--seat-color': style.color }"
    :disabled="!clickable"
    :title="`${props.seat.row}${props.seat.col} - ${style.label}`"
    @click="handleClick"
  >
    {{ props.seat.col }}
  </button>
</template>

<style scoped lang="scss">
.seat-item {
  width: 28px;
  height: 28px;
  margin: 2px;
  border-radius: 4px;
  border: 1px solid var(--seat-color, var(--color-text-placeholder));
  background: transparent;
  color: var(--seat-color, var(--color-text));
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(.not-clickable) {
    transform: scale(1.1);
    box-shadow: 0 0 0 2px var(--seat-color);
  }
  &.selected {
    background: var(--seat-color);
    color: #fff;
  }
  &.is-mine {
    background: var(--seat-color);
    color: #fff;
  }
  &.not-clickable {
    cursor: not-allowed;
    opacity: 0.6;
  }
  &.is-disabled-seat {
    background: var(--seat-color);
    color: #fff;
    opacity: 0.3;
  }
  &.is-dimmed {
    opacity: 0.35;
    filter: grayscale(0.7);
    &:hover:not(.not-clickable) {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }
  &:disabled {
    cursor: not-allowed;
  }
}
</style>

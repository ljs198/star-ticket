<!--
  在线选座页（views/user/seat/SeatSelection.vue）—— 核心页面
  知识点：
  1. 路由参数 route.params.sessionId 为场次 ID，route.query.categoryId 为当前票档
  2. cartStore：跨页面共享已选座位（选座 = 加购），切换场次自动清空
  3. 选座即锁座：点击 AVAILABLE 立即调 useSeatLock().lock([seatId])，失败回滚 UI
  4. useSeatPolling：30s 轮询座位图，展示“状态更新于 X 秒前”
  5. useCountdown：以 lockExpireAt 驱动锁座倒计时，过期清空购物车
  6. onBeforeRouteLeave：离开页面且非跳确认页时释放座位，避免占座
  7. 限购上限 MAX_SEAT_COUNT=4，达上限弹提示
  8. 底部固定操作栏：已选座位、合计金额、“确认选座”按钮
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage } from 'element-plus'
import { sessionApi, seatApi } from '@/api'
import type { Seat, SeatArea, TicketCategory } from '@/api/types'
import { useCartStore, useUserStore } from '@/stores'
import { useSeatLock, useSeatPolling, useCountdown } from '@/composables'
import { SeatMap } from '@/components'
import { formatMoneyWithSymbol } from '@/utils/format'
import { SeatStatus } from '@/utils/seat-status'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

const sessionId = computed(() => Number(route.params.sessionId))
const eventId = ref<number | null>(null)
const areas = ref<SeatArea[]>([])
const loading = ref(false)
const categories = ref<TicketCategory[]>([])

/** 当前票档（用于读取 limitPerUser 作为选座上限，可被管理员修改） */
const currentCategory = computed(
  () => categories.value.find((c) => c.id === cartStore.currentCategoryId) ?? null
)
/** 选座上限：动态读取当前票档的 limitPerUser，而不是写死的 MAX_SEAT_COUNT */
const seatLimit = computed(() => currentCategory.value?.limitPerUser ?? 4)
/** 当前票档已选座位数（仅统计属于当前票档的座位） */
const selectedCountInCurrentCategory = computed(
  () => cartStore.selectedSeats.filter((s) => s.categoryId === cartStore.currentCategoryId).length
)
/** 是否已达上限（基于当前票档的限购数动态判断，按票档独立计数） */
const isFull = computed(() => selectedCountInCurrentCategory.value >= seatLimit.value)

const { lock, unlock } = useSeatLock()

/* ============== 锁座倒计时 ============== */
const countdown = useCountdown({
  expireAt: cartStore.lockExpireAt,
  onExpire: () => {
    // 锁座过期：先捕获座位 ID，再清空购物车，最后通知后端释放座位
    const seatIds = [...cartStore.seatIds]
    const sid = sessionId.value
    cartStore.clear()
    if (seatIds.length) {
      unlock(sid, seatIds).catch(() => {})
    }
    ElMessage.warning('锁座已过期，请重新选座')
  }
})

/* ============== 座位状态轮询 30s ============== */
const polling = useSeatPolling({
  sessionId: sessionId.value,
  onUpdate: (next: SeatArea[]) => {
    areas.value = next
    // 同步更新已选座位的最新状态/价格（保留选中态）
    syncSelectedFromAreas()
  }
})

/** 从轮询数据同步已选座位的最新价格/状态（避免展示过期价格） */
function syncSelectedFromAreas() {
  if (!cartStore.selectedSeats.length) return
  const allSeats = areas.value.flatMap((a) => a.seats)
  const map = new Map<number, Seat>()
  allSeats.forEach((s) => map.set(s.id, s))
  // 用新数组替换，避免直接索引赋值导致的反应性问题
  const updated = cartStore.selectedSeats
    .map((s) => map.get(s.id))
    .filter((s): s is Seat => s != null)
  if (updated.length !== cartStore.selectedSeats.length) {
    // 有座位在最新数据中不存在（被他人购买等），清空重选
    cartStore.clear()
    ElMessage.warning('部分座位状态已变更，请重新选择')
  } else {
    cartStore.selectedSeats.splice(0, cartStore.selectedSeats.length, ...updated)
  }
}

/* ============== 初始化 ============== */
async function init() {
  loading.value = true
  try {
    const sid = sessionId.value
    // 1. 拉场次拿到 eventId（购物车需要）
    const session = await sessionApi.detail(sid)
    eventId.value = session.eventId
    cartStore.setSession(sid, session.eventId)
    // 2. 设置当前票档
    const cid = route.query.categoryId
    if (cid) cartStore.setCategory(Number(cid))
    // 3. 拉取票档列表（拿到当前票档的 limitPerUser，用于动态选座上限）
    try {
      categories.value = await sessionApi.categories(sid)
    } catch {
      /* 拉取失败用默认上限 4 */
    }
    // 4. 拉座位图
    areas.value = await seatApi.getSeatMap(sid)
    // 5. 弱网兜底：购物车空时尝试恢复“我的锁座”
    if (cartStore.isEmpty) {
      try {
        const mine = await seatApi.getMyLockedSeats(sid)
        if (mine && mine.length) {
          cartStore.restoreFromLockedSeats(mine)
          const latest = mine
            .map((s) => s.lockExpireAt)
            .filter((v): v is string => !!v)
            .sort()
            .pop()
          if (latest) {
            cartStore.setLockExpireAt(latest)
            countdown.reset(latest)
          }
        }
      } catch {
        /* 恢复失败不影响选座 */
      }
    } else if (cartStore.lockExpireAt) {
      countdown.reset(cartStore.lockExpireAt)
    }
  } finally {
    loading.value = false
  }
}

/**
 * 通过 Vue 响应式 Proxy 更新 areas.value 中对应座位的字段。
 *
 * 必要性：mock 的 lock/unlock handler 直接修改 seatsBySession 中的原始对象，
 * 但 areas.value 经 Vue 3 reactive 包装后是 Proxy 代理；直接改原始对象
 * 不触发 Proxy 的 set trap，组件不会重新渲染，SeatItem 的 clickable computed
 * 也不会重新计算 —— 导致"取消后 UI 仍显示 LOCKED、再选失败"等问题。
 *
 * 实现细节：用**新对象替换**数组中的 seat（而非 Object.assign 原地改）。
 * 因为 mock 已先把原始对象的 status/lockUserId 改成目标值，若再用
 * Object.assign 设置相同值，Vue 的 set trap 用 Object.is 比较认为"没变化"，
 * 不会 trigger —— isMine computed 永远不 dirty，颜色/可点击性都不更新。
 * 替换为新对象引用则必然触发数组 set trap，强制 SeatItem 重新渲染。
 */
function updateSeatInAreas(seatId: number, patch: Partial<Seat>) {
  for (const area of areas.value) {
    const idx = area.seats.findIndex((s) => s.id === seatId)
    if (idx >= 0) {
      area.seats[idx] = { ...area.seats[idx], ...patch }
      return
    }
  }
}

/* ============== 选座交互 ============== */
async function handleSelect(seat: Seat) {
  // 点击非当前票档的座位 -> 先切换到该票档（已选座位保留，可跨票档合计付款）
  if (cartStore.currentCategoryId && seat.categoryId !== cartStore.currentCategoryId) {
    cartStore.setCategory(seat.categoryId!)
  }
  const exists = cartStore.selectedSeats.some((s) => s.id === seat.id)
  if (exists) {
    // 已选 -> 取消选中并释放该座位
    cartStore.removeSeat(seat.id)
    await unlock(sessionId.value, [seat.id])
    updateSeatInAreas(seat.id, {
      status: SeatStatus.AVAILABLE,
      lockUserId: undefined,
      lockExpireAt: undefined
    })
    return
  }
  // 按当前票档的限购数独立判断上限
  const countInCat = cartStore.selectedSeats.filter(
    (s) => s.categoryId === seat.categoryId
  ).length
  const limit = categories.value.find((c) => c.id === seat.categoryId)?.limitPerUser ?? 4
  if (countInCat >= limit) {
    ElMessage.warning(`该票档已达上限，最多选择 ${limit} 个座位`)
    return
  }
  const ok = cartStore.addSeat(seat)
  if (!ok) return
  // 选座即锁座：立即锁定该座位
  const { expireAt, failedSeatIds } = await lock(sessionId.value, [seat.id])
  if (failedSeatIds.includes(seat.id)) {
    // 锁定失败 -> 回滚 UI
    cartStore.removeSeat(seat.id)
    updateSeatInAreas(seat.id, {
      status: SeatStatus.AVAILABLE,
      lockUserId: undefined,
      lockExpireAt: undefined
    })
  } else {
    // 锁定成功 -> 同步 UI 状态，确保 SeatItem 立即反映 LOCKED + isMine
    updateSeatInAreas(seat.id, {
      status: SeatStatus.LOCKED,
      lockUserId: currentUserId.value ?? undefined,
      lockExpireAt: expireAt ?? undefined
    })
    if (expireAt) {
      cartStore.setLockExpireAt(expireAt)
      countdown.reset(expireAt)
    }
  }
}

/* ============== 确认选座 -> 确认订单页 ============== */
function handleConfirm() {
  if (cartStore.isEmpty) {
    ElMessage.warning('请先选择座位')
    return
  }
  if (!cartStore.isLocked) {
    ElMessage.warning('座位锁定已过期，请重新选座')
    return
  }
  router.push('/orders/confirm')
}

/* ============== 已选座位展示 ============== */
const selectedLabels = computed(() =>
  cartStore.selectedSeats.map((s) => `${s.row}${s.col}`).join('、')
)
const totalText = computed(() => formatMoneyWithSymbol(cartStore.totalAmount))
const currentUserId = computed(() => userStore.user?.id)

/* ============== 离开页面释放座位（非跳确认页） ============== */
onBeforeRouteLeave((to) => {
  if (to.path === '/orders/confirm') return true
  if (cartStore.count > 0) {
    // 释放座位（fire-and-forget，不阻塞导航）
    unlock(sessionId.value, cartStore.seatIds)
  }
  return true
})

function goBack() {
  router.push(`/sessions/${sessionId.value}`)
}

onMounted(init)
</script>

<template>
  <div class="page seat-page">
    <div class="seat-header">
      <el-button link @click="goBack">← 返回场次</el-button>
      <span v-if="currentCategory" class="current-cat">
        当前票档：<span class="cat-name" :style="{ color: currentCategory.color }">{{ currentCategory.name }}</span>
        <span class="cat-hint">（点击其他区域可切换票档）</span>
      </span>
      <span class="poll-tip">状态更新于 {{ polling.secondsSinceUpdate.value }} 秒前</span>
    </div>

    <div class="page-body">
      <el-skeleton v-if="loading" :rows="8" animated />
      <SeatMap
        v-else
        :areas="areas"
        :current-user-id="currentUserId"
        :current-category-id="cartStore.currentCategoryId ?? undefined"
        :selected-ids="cartStore.seatIds"
        :disabled="isFull"
        @select="handleSelect"
      />
    </div>

    <div class="bottom-bar safe-area-bottom">
      <div class="bar-left">
        <div class="selected-info">
          <span class="label">已选 {{ cartStore.count }} 座</span>
          <span v-if="cartStore.count" class="seats">{{ selectedLabels }}</span>
          <span v-else class="placeholder">请选择座位</span>
        </div>
        <div class="total">
          <span class="total-label">合计</span>
          <span class="total-amount">{{ totalText }}</span>
        </div>
      </div>
      <div class="bar-right">
        <span v-if="cartStore.isLocked" class="lock-countdown">
          锁座剩余 {{ countdown.text.value }}
        </span>
        <el-button
          type="primary"
          size="large"
          :disabled="cartStore.isEmpty || !cartStore.isLocked"
          @click="handleConfirm"
        >
          确认选座
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.seat-page {
  padding-bottom: var(--bottom-bar-height);
}
.seat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  gap: 12px;
  flex-wrap: wrap;
}
.current-cat {
  font-size: 13px;
  color: var(--color-text-secondary);
  .cat-name {
    font-weight: 700;
  }
  .cat-hint {
    font-size: 12px;
    color: var(--color-text-placeholder);
  }
}
.poll-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.bar-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.selected-info {
  display: flex;
  align-items: center;
  gap: 8px;
  .label {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
  .seats {
    font-size: 14px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .placeholder {
    font-size: 13px;
    color: var(--color-text-placeholder);
  }
}
.total {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.total-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.total-amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-danger);
}
.bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lock-countdown {
  font-size: 13px;
  color: var(--color-warning);
  font-weight: 600;
}
/* ========== 移动端（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .seat-page {
    /* 选座页不显示底部 Tab Bar，只需为吸底确认栏留空间 */
    padding-bottom: calc(110px + env(safe-area-inset-bottom));
  }
  .seat-header {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 8px 0;
  }
  .poll-tip { display: none; }
  .bottom-bar {
    flex-direction: column;
    align-items: stretch;
    height: auto;
    min-height: 56px;
    padding: 8px 12px;
    gap: 8px;
  }
  .bar-left { flex-direction: row; align-items: center; gap: 12px; }
  .selected-info .seats { font-size: 13px; }
  .total-amount { font-size: 16px; }
  .bar-right {
    width: 100%;
    :deep(.el-button) { width: 100%; }
  }
  .bar-right .lock-countdown {
    display: none;
  }
}
</style>

/**
 * 选座购物车 Store（stores/cart.ts）
 *
 * 知识点：
 * 1. 命名 cart（PRD v2.0 第 3 章）：选座 = 加购，下单时从 cart 取出
 * 2. 状态：当前场次、已选座位列表、锁座过期时间
 * 3. 批量上限 4 个（PRD v2.0 第 3 条），超限拒绝加入
 * 4. 锁座过期时间由后端返回 expireAt，useSeatLock 写入，倒计时驱动
 * 5. 切换场次时清空已选（避免跨场次混选）
 * 6. 页面刷新后从后端 getMyLockedSeats 恢复（弱网兜底）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Seat } from '@/api/types'
import { MAX_SEAT_COUNT } from '@/utils/seat-status'

export const useCartStore = defineStore('cart', () => {
  /* ============== state ============== */
  /** 当前选座场次 ID */
  const sessionId = ref<number | null>(null)
  /** 当前场次所属演出 ID（下单需要） */
  const eventId = ref<number | null>(null)
  /** 已选座位列表（即"购物车"） */
  const selectedSeats = ref<Seat[]>([])
  /** 锁座过期时间（ISO 字符串） */
  const lockExpireAt = ref<string | null>(null)
  /** 当前选中的票档（普通下单模式） */
  const currentCategoryId = ref<number | null>(null)

  /* ============== getters ============== */
  /** 已选座位数 */
  const count = computed(() => selectedSeats.value.length)
  /** 已选座位 ID */
  const seatIds = computed(() => selectedSeats.value.map((s) => s.id))
  /** 是否已达上限 */
  const isFull = computed(() => count.value >= MAX_SEAT_COUNT)
  /** 是否为空 */
  const isEmpty = computed(() => count.value === 0)
  /** 总价（分） */
  const totalAmount = computed(() =>
    selectedSeats.value.reduce((sum, s) => sum + (s.price ?? 0), 0)
  )
  /** 是否已锁座（lockExpireAt 存在且未过期） */
  const isLocked = computed(() => {
    if (!lockExpireAt.value) return false
    return new Date(lockExpireAt.value).getTime() > Date.now()
  })

  /* ============== actions ============== */
  /** 切换场次时清空已选 */
  function setSession(sid: number, eid: number) {
    if (sessionId.value !== sid) {
      selectedSeats.value = []
      lockExpireAt.value = null
    }
    sessionId.value = sid
    eventId.value = eid
  }

  /**
   * 加入座位（已选则忽略）
   * 注意：上限判断由调用方（如 SeatSelection 用当前 category 的 limitPerUser）决定，
   *       store 不再硬编码 MAX_SEAT_COUNT，避免与可配置的限购数冲突
   * @returns 是否加入成功（已存在视为成功）
   */
  function addSeat(seat: Seat): boolean {
    if (selectedSeats.value.some((s) => s.id === seat.id)) return true
    selectedSeats.value.push(seat)
    return true
  }

  /** 移除座位 */
  function removeSeat(seatId: number) {
    selectedSeats.value = selectedSeats.value.filter((s) => s.id !== seatId)
  }

  /** 清空已选 */
  function clear() {
    selectedSeats.value = []
    lockExpireAt.value = null
    currentCategoryId.value = null
  }

  /** 设置锁座过期时间（锁座成功后调用） */
  function setLockExpireAt(expireAt: string) {
    lockExpireAt.value = expireAt
  }

  /** 设置当前票档 */
  function setCategory(categoryId: number) {
    currentCategoryId.value = categoryId
  }

  /**
   * 从后端返回的"我的座位"恢复（页面刷新场景）
   */
  function restoreFromLockedSeats(seats: Seat[], expireAt?: string) {
    selectedSeats.value = seats
    if (expireAt) lockExpireAt.value = expireAt
  }

  return {
    // state
    sessionId,
    eventId,
    selectedSeats,
    lockExpireAt,
    currentCategoryId,
    // getters
    count,
    seatIds,
    isFull,
    isEmpty,
    totalAmount,
    isLocked,
    // actions
    setSession,
    addSeat,
    removeSeat,
    clear,
    setLockExpireAt,
    setCategory,
    restoreFromLockedSeats
  }
})

/**
 * 批量锁座 Composable（composables/useSeatLock.ts）
 *
 * 知识点：
 * 1. 锁座接口（PRD v2.0 第 3 条）：POST /seats/lock
 *    body { sessionId, seatIds:[1-4] }
 *    响应 { expireAt, results:[{seatId, success, failReason}] }
 * 2. 部分成功：results 中逐个判断 success，失败的座位 UI 回滚为可售
 * 3. 失败原因：SEAT_TAKEN（被抢）/ NOT_AVAILABLE（不可售）/ LIMIT_EXCEEDED（超限）
 * 4. 锁座成功后把 expireAt 写入 cart store，倒计时由 useCountdown 驱动
 * 5. 释放座位：DELETE /seats/lock，离开选座页/取消时调用
 * 6. 弱网兜底：失败时给用户明确文案，可重试
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { seatApi } from '@/api'
import type { SeatLockResponse } from '@/api/types'
import { useCartStore } from '@/stores/cart'
import { getFailReasonLabel } from '@/utils/seat-status'
import type { BusinessError } from '@/api/http'

export function useSeatLock() {
  const cartStore = useCartStore()
  const loading = ref(false)

  /**
   * 批量锁座
   * @param sessionId 场次 ID
   * @param seatIds 座位 ID 列表（1-4）
   * @returns { expireAt, failedSeatIds } 锁定成功到期时间 + 失败座位 ID 列表
   */
  async function lock(sessionId: number, seatIds: number[]): Promise<{
    expireAt?: string
    failedSeatIds: number[]
  }> {
    if (!seatIds.length) return { failedSeatIds: [] }
    loading.value = true
    try {
      const res: SeatLockResponse = await seatApi.lock({
        sessionId,
        seatIds
      })
      const failedSeatIds: number[] = []
      for (const r of res.results) {
        if (!r.success && r.failReason) {
          failedSeatIds.push(r.seatId)
          ElMessage.warning(getFailReasonLabel(r.failReason))
        }
      }
      // 成功则写入过期时间
      if (res.expireAt) {
        cartStore.setLockExpireAt(res.expireAt)
      }
      return { expireAt: res.expireAt, failedSeatIds }
    } catch (err) {
      const e = err as BusinessError
      ElMessage.error(e.message || '锁座失败')
      return { failedSeatIds: seatIds }
    } finally {
      loading.value = false
    }
  }

  /**
   * 释放座位（取消选中或离开选座页时调用）
   */
  async function unlock(sessionId: number, seatIds: number[]): Promise<void> {
    if (!seatIds.length) return
    try {
      await seatApi.unlock({ sessionId, seatIds })
    } catch {
      /* 静默失败，不影响用户操作 */
    }
  }

  return {
    loading,
    lock,
    unlock
  }
}

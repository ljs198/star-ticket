/**
 * 订单状态轮询 Composable（composables/useOrderStatus.ts）
 *
 * 知识点：
 * 1. PRD v2.0 第 12 条：收银台页 5s 轮询订单状态
 * 2. 轮询时机：进入支付页开始，离开停止（onUnmounted 清理）
 * 3. 状态变更触发回调（onStatusChange），业务侧收到 PAID 跳成功页
 * 4. 服务端推送：本项目用轮询代替 WebSocket，简单可靠
 * 5. 异常容错：单次失败不中断轮询，避免网络抖动导致停止
 * 6. 最大轮询次数兜底：避免无限轮询（默认 1000 次，约 83 分钟）
 */
import { ref, onUnmounted } from 'vue'
import { orderApi } from '@/api'
import type { OrderDetail } from '@/api/types'
import type { OrderStatus } from '@/utils/order-status'

export interface UseOrderStatusOptions {
  orderNo: string
  /** 状态变更回调 */
  onStatusChange?: (status: OrderStatus, detail: OrderDetail) => void
  /** 轮询间隔，默认 5s */
  interval?: number
  /** 最大轮询次数，默认 1000 */
  maxRetries?: number
}

export function useOrderStatus(options: UseOrderStatusOptions) {
  const { orderNo, onStatusChange, interval = 5000, maxRetries = 1000 } = options
  const currentStatus = ref<OrderStatus | null>(null)
  const loading = ref(false)
  let timer: number | null = null
  let retryCount = 0

  async function fetchOnce() {
    if (loading.value) return
    loading.value = true
    try {
      const detail = await orderApi.detail(orderNo)
      const newStatus = detail.status
      if (currentStatus.value !== newStatus) {
        const prev = currentStatus.value
        currentStatus.value = newStatus
        if (prev !== null) {
          // 首次不算"变更"
          onStatusChange?.(newStatus, detail)
        }
      }
      retryCount = 0 // 成功重置计数
    } catch {
      // 单次失败不中断轮询，累加计数
      retryCount++
      if (retryCount >= maxRetries) {
        stop()
      }
    } finally {
      loading.value = false
    }
  }

  function start() {
    stop()
    fetchOnce()
    timer = window.setInterval(fetchOnce, interval)
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }
  }

  if (orderNo) start()

  onUnmounted(stop)

  return {
    currentStatus,
    loading,
    start,
    stop,
    fetchOnce
  }
}

/**
 * 座位状态轮询 Composable（composables/useSeatPolling.ts）
 *
 * 知识点：
 * 1. PRD v2.0 第 12 条：选座页 30s 轮询座位状态 + "状态更新于 X 秒前"
 * 2. 轮询策略：仅查询座位图（GET /sessions/:id/seats），不重新加载页面
 * 3. 弱网兜底：单次失败保留旧数据，避免页面闪烁
 * 4. 离开页面停止轮询（visibilitychange + onUnmounted）
 * 5. 可见性 API：document.hidden 监听，标签切走暂停，节省请求
 */
import { ref, onUnmounted, onMounted } from 'vue'
import { seatApi } from '@/api'
import type { SeatArea } from '@/api/types'

export interface UseSeatPollingOptions {
  sessionId: number
  /** 轮询间隔，默认 30s */
  interval?: number
  /** 数据更新回调 */
  onUpdate?: (areas: SeatArea[]) => void
}

export function useSeatPolling(options: UseSeatPollingOptions) {
  const { sessionId, interval = 30000, onUpdate } = options
  const lastUpdateTime = ref<number>(Date.now())
  const secondsSinceUpdate = ref(0)
  const loading = ref(false)
  let timer: number | null = null
  let countdownTimer: number | null = null
  let stoppedByVisibility = false

  async function fetchOnce() {
    if (loading.value) return
    loading.value = true
    try {
      const areas = await seatApi.getSeatMap(sessionId)
      lastUpdateTime.value = Date.now()
      secondsSinceUpdate.value = 0
      onUpdate?.(areas)
    } catch {
      /* 静默失败，保留旧数据 */
    } finally {
      loading.value = false
    }
  }

  function startCountdown() {
    countdownTimer = window.setInterval(() => {
      secondsSinceUpdate.value = Math.floor((Date.now() - lastUpdateTime.value) / 1000)
    }, 1000)
  }

  function start() {
    stop()
    fetchOnce()
    timer = window.setInterval(fetchOnce, interval)
    startCountdown()
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }
    if (countdownTimer) {
      window.clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  // 页面可见性监听
  function handleVisibility() {
    if (document.hidden) {
      stop()
      stoppedByVisibility = true
    } else if (stoppedByVisibility) {
      start()
      stoppedByVisibility = false
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibility)
    start()
  })

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', handleVisibility)
  })

  return {
    lastUpdateTime,
    secondsSinceUpdate,
    loading,
    fetchOnce,
    start,
    stop
  }
}

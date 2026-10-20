/**
 * 倒计时 Composable（composables/useCountdown.ts）
 *
 * 知识点：
 * 1. Composition API：抽离逻辑复用，setup 中可多次调用
 * 2. setInterval 定时器：必须 onUnmounted 清理，避免内存泄漏
 * 3. 倒计时驱动：传入 expireAt（ISO 字符串），按秒计算剩余
 * 4. 归零回调：到达 0 触发 onExpire，业务侧可触发关单/释放座位
 * 5. 弱网兜底：expireAt 由后端返回，前端时钟可能与后端有偏差，
 *    用本地时间计算，前端展示"倒计时"足够精确
 */
import { ref, onUnmounted, computed } from 'vue'

export interface UseCountdownOptions {
  /** 到期时间（ISO 字符串或时间戳） */
  expireAt: string | number | null
  /** 到期回调 */
  onExpire?: () => void
  /** 是否每秒触发（默认 true） */
  interval?: number
}

export function useCountdown(options: UseCountdownOptions) {
  const { onExpire, interval = 1000 } = options
  // 用 ref 存储 expireAt，reset 时可更新（原实现解构后无法同步更新）
  const expireAt = ref<string | number | null>(options.expireAt ?? null)
  const remaining = ref(0)
  let timer: number | null = null
  let expired = false

  function getExpireTime(): number {
    const val = expireAt.value
    if (!val) return 0
    if (typeof val === 'number') return val
    return new Date(val.replace(/-/g, '/')).getTime()
  }

  function tick() {
    const expire = getExpireTime()
    if (!expire) {
      remaining.value = 0
      return
    }
    const left = Math.max(0, Math.floor((expire - Date.now()) / 1000))
    remaining.value = left
    if (left <= 0 && !expired) {
      expired = true
      stop()
      onExpire?.()
    }
  }

  function start() {
    stop()
    expired = false
    tick()
    timer = window.setInterval(tick, interval)
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }
  }

  /** 重置新的过期时间 */
  function reset(newExpireAt: string | number) {
    remaining.value = 0
    expired = false
    expireAt.value = newExpireAt
    start()
  }

  // 自动启动
  if (expireAt.value) start()

  // 组件卸载时清理
  onUnmounted(stop)

  /** 剩余 mm:ss 文本 */
  const text = computed(() => {
    const m = Math.floor(remaining.value / 60)
    const s = remaining.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  return {
    remaining,
    text,
    start,
    stop,
    reset
  }
}

/**
 * 通用请求 Composable（composables/useRequest.ts）
 *
 * 知识点：
 * 1. 抽象"请求 + loading + error + data"的通用模板，避免业务侧重复写 try/catch
 * 2. 支持手动触发与立即执行两种模式
 * 3. loading 状态由 ref 维护，组件可直接绑定到按钮 :loading
 * 4. onError 默认弹错（http 拦截器已弹），但允许业务侧自定义处理
 * 5. 防重入：loading 中再次调用直接返回上次 Promise
 */
import { ref, shallowRef } from 'vue'
import type { BusinessError } from '@/api/http'

export interface UseRequestOptions<T> {
  /** 是否立即执行，默认 false */
  immediate?: boolean
  /** 初始数据 */
  initialData?: T
  /** 成功回调 */
  onSuccess?: (data: T) => void
  /** 失败回调 */
  onError?: (err: BusinessError) => void
}

export function useRequest<T = unknown>(
  fn: (...args: unknown[]) => Promise<T>,
  options: UseRequestOptions<T> = {}
) {
  const { immediate = false, initialData, onSuccess, onError } = options
  const data = shallowRef<T | undefined>(initialData)
  const loading = ref(false)
  const error = ref<BusinessError | null>(null)
  let inflight: Promise<T> | null = null

  async function run(...args: unknown[]): Promise<T | undefined> {
    // 防重入
    if (inflight) return inflight
    loading.value = true
    error.value = null
    inflight = fn(...args)
    try {
      const res = await inflight
      data.value = res
      onSuccess?.(res)
      return res
    } catch (err) {
      error.value = err as BusinessError
      onError?.(err as BusinessError)
      return undefined
    } finally {
      loading.value = false
      inflight = null
    }
  }

  /** 重置状态 */
  function reset() {
    data.value = initialData
    loading.value = false
    error.value = null
  }

  if (immediate) run()

  return {
    data,
    loading,
    error,
    run,
    reset
  }
}

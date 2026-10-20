/**
 * 可重试数据拉取 composable（composables/useRetryableFetch.ts）
 *
 * 知识点：
 * 1. 统一管理列表/详情类接口的 loading / error / data 三态
 * 2. 失败时 error 非空，配合 RetryError 组件提供重试入口
 * 3. retry() 重新执行上次 fetcher，无需父组件重复传参
 * 4. fetcher 返回值写入 data，异常写入 error（拦截器弹错后再吞掉，避免控制台噪音）
 */
import { ref, shallowRef } from 'vue'

export function useRetryableFetch<T>(fetcher: () => Promise<T>) {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const data = shallowRef<T | null>(null)

  async function run() {
    loading.value = true
    error.value = null
    try {
      const res = await fetcher()
      data.value = res
      return res
    } catch (e) {
      error.value = e
      // 拦截器已统一弹错，这里仅记录错误态用于 UI 兜底
      return null
    } finally {
      loading.value = false
    }
  }

  /** 重试：复用同一 fetcher */
  function retry() {
    return run()
  }

  return { loading, error, data, run, retry }
}

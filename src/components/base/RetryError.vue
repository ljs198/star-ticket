<!--
  加载失败重试组件（components/base/RetryError.vue）
  知识点：
  1. 统一加载失败兜底：接口报错时展示错误信息 + 重试按钮（PRD：加载失败统一重试）
  2. 与 useRetryableFetch 配合：loading/error 由 composable 管理，@retry 触发重新拉取
  3. 纯展示组件，不持有数据，由父组件驱动
-->
<script setup lang="ts">
import { ElButton } from 'element-plus'

interface Props {
  /** 错误描述，缺省给默认文案 */
  message?: string
  /** 重试按钮文案 */
  retryText?: string
  /** 是否正在重试（重试按钮 loading） */
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  message: '加载失败，请稍后重试',
  retryText: '重新加载',
  loading: false
})

const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div class="retry-error">
    <div class="retry-icon" aria-hidden="true">
      <svg viewBox="0 0 1024 1024" width="48" height="48">
        <path
          d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 768c-176.7 0-320-143.3-320-320s143.3-320 320-320 320 143.3 320 320-143.3 320-320 320z"
          fill="currentColor"
        />
        <path
          d="M464 320h96v272h-96zM464 688h96v96h-96z"
          fill="currentColor"
        />
      </svg>
    </div>
    <p class="retry-msg">{{ message }}</p>
    <el-button type="primary" :loading="loading" @click="emit('retry')">
      {{ retryText }}
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.retry-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 16px;
  text-align: center;
}
.retry-icon {
  color: var(--color-text-placeholder);
}
.retry-msg {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}
</style>

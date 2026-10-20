<!--
  支付倒计时（components/order/PayCountdown.vue）
  知识点：
  1. 复用 useCountdown composable，传入 expireTime
  2. 倒计时归零触发 @expire，业务侧跳转订单详情或提示已关闭
  3. 倒计时颜色：< 60s 显示红色警示
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useCountdown } from '@/composables/useCountdown'

interface Props {
  /** 订单过期时间（ISO 字符串） */
  expireTime: string
  /** 样式：'text' 纯文本 | 'tag' 标签 */
  variant?: 'text' | 'tag'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'tag'
})

const emit = defineEmits<{
  (e: 'expire'): void
}>()

const { remaining, text } = useCountdown({
  expireAt: props.expireTime,
  onExpire: () => emit('expire')
})

const isUrgent = computed(() => remaining.value <= 60)
</script>

<template>
  <span v-if="props.variant === 'tag'" class="pay-countdown" :class="{ urgent: isUrgent }">
    剩余 {{ text }}
  </span>
  <span v-else :class="{ urgent: isUrgent }" :style="{ color: isUrgent ? 'var(--color-danger)' : 'var(--color-warning)' }">
    {{ text }}
  </span>
</template>

<style scoped lang="scss">
.pay-countdown {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius);
  background: rgba(239, 170, 23, 0.1);
  color: var(--color-warning);
  font-weight: 600;
  font-size: 14px;
  &.urgent {
    background: rgba(232, 70, 58, 0.1);
    color: var(--color-danger);
    animation: blink 1s infinite;
  }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>

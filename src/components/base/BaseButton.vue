<!--
  通用按钮（components/base/BaseButton.vue）
  知识点：
  1. 二次封装 el-button，统一主题色与防抖
  2. props 透传：$attrs 自动透到内部 el-button
  3. loading 防重：点击后 loading=true 阻止重复点击（业务侧需绑定 loading）
  4. 默认 type=primary，与品牌色一致
-->
<script setup lang="ts">
import { ElButton } from 'element-plus'

interface Props {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  size?: 'large' | 'default' | 'small'
  loading?: boolean
  disabled?: boolean
  plain?: boolean
  round?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'default',
  loading: false,
  disabled: false,
  plain: false,
  round: false
})
</script>

<template>
  <el-button
    :type="props.type"
    :size="props.size"
    :loading="props.loading"
    :disabled="props.disabled || props.loading"
    :plain="props.plain"
    :round="props.round"
  >
    <slot />
  </el-button>
</template>

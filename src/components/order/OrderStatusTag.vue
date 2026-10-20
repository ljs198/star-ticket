<!--
  订单状态标签（components/order/OrderStatusTag.vue）
  知识点：
  1. 复用 utils/order-status.ts 的状态映射
  2. el-tag type 对应主题色：success/info/warning/danger
  3. 受控组件：父组件传入 status，组件内部计算文案与样式
-->
<script setup lang="ts">
import { computed } from 'vue'
import { ElTag } from 'element-plus'
import { getOrderStatusMeta, type OrderStatus } from '@/utils/order-status'

interface Props {
  status: OrderStatus
  size?: 'large' | 'default' | 'small'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default'
})

const meta = computed(() => getOrderStatusMeta(props.status))
</script>

<template>
  <el-tag :type="meta.type" :size="props.size" effect="light">
    {{ meta.label }}
  </el-tag>
</template>

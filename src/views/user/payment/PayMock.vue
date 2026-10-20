<!--
  收银台 / 模拟支付页（views/user/payment/PayMock.vue）
  知识点：
  1. 路由参数 route.params.orderNo
  2. orderApi.detail 拉订单详情展示摘要
  3. useOrderStatus 5s 轮询：状态离开 UNPAID（PAID/CANCELED 等）即跳订单详情
  4. PayCountdown 由 expireTime 驱动倒计时，@expire 提示订单关闭并跳转
  5. 模拟支付：payNo=genPayKey() + idempotencyKey=genPayKey()，paymentApi.mockPay
  6. duplicated=true -> ElMessage.info('请勿重复支付')
  7. 金额单位分 -> 元：formatMoneyWithSymbol
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi, paymentApi } from '@/api'
import type { OrderDetail } from '@/api/types'
import { useOrderStatus } from '@/composables'
import { OrderStatus, isTerminalStatus, canPay } from '@/utils/order-status'
import { PayCountdown } from '@/components'
import { genPayKey } from '@/utils/idempotency'
import { formatMoneyWithSymbol, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const orderNo = route.params.orderNo as string
const loading = ref(true)
const paying = ref(false)
const order = ref<OrderDetail | null>(null)

/** 订单状态轮询 5s */
const { currentStatus } = useOrderStatus({
  orderNo,
  interval: 5000,
  onStatusChange: (status, detail) => {
    order.value = detail
    if (status === OrderStatus.PAID) {
      ElMessage.success('支付成功')
      router.push(`/orders/${orderNo}`)
    } else if (status !== OrderStatus.UNPAID) {
      // 订单已关闭/取消/退款中 等，离开收银台
      ElMessage.warning('订单状态已变更')
      router.push(`/orders/${orderNo}`)
    }
  }
})

const payAmountText = computed(() =>
  order.value ? formatMoneyWithSymbol(order.value.payAmount) : ''
)
const canPayNow = computed(() => !!order.value && canPay(order.value.status))

async function fetchOrder() {
  loading.value = true
  try {
    const detail = await orderApi.detail(orderNo)
    order.value = detail
    // 进入时订单已非待支付（如已支付/已关闭），直接跳详情
    if (detail.status !== OrderStatus.UNPAID) {
      if (detail.status === OrderStatus.PAID) {
        ElMessage.success('订单已支付')
      } else {
        ElMessage.warning('订单已关闭')
      }
      router.replace(`/orders/${orderNo}`)
    }
  } finally {
    loading.value = false
  }
}

/** 模拟支付 */
async function handlePay() {
  if (!order.value || !canPayNow.value) return
  paying.value = true
  const payNo = genPayKey()
  const idempotencyKey = genPayKey()
  try {
    const res = await paymentApi.mockPay(
      { orderNo, amount: order.value.payAmount, payNo },
      idempotencyKey
    )
    if (res.duplicated) {
      ElMessage.info('请勿重复支付')
    }
    if (res.orderStatus === OrderStatus.PAID) {
      ElMessage.success('支付成功')
      router.push(`/orders/${orderNo}`)
    }
  } finally {
    paying.value = false
  }
}

/** 倒计时到期：订单关闭 */
function handleExpire() {
  ElMessage.warning('订单已关闭')
  router.push(`/orders/${orderNo}`)
}

onMounted(fetchOrder)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <el-skeleton v-if="loading" :rows="6" animated />
      <div v-else-if="order" class="pay-card card">
        <h2 class="pay-title">收银台</h2>
        <div class="pay-amount">{{ payAmountText }}</div>

        <div class="pay-info">
          <div class="info-row">
            <span class="info-label">订单号</span>
            <span class="info-value">{{ order.orderNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">演出</span>
            <span class="info-value">{{ order.eventTitle }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">场次时间</span>
            <span class="info-value">{{ formatDateTime(order.showTime) }}</span>
          </div>
          <div v-if="order.expireTime" class="info-row">
            <span class="info-label">支付倒计时</span>
            <PayCountdown :expire-time="order.expireTime" @expire="handleExpire" />
          </div>
        </div>

        <el-button
          class="pay-btn"
          type="primary"
          size="large"
          :loading="paying"
          :disabled="!canPayNow"
          @click="handlePay"
        >
          模拟支付 {{ payAmountText }}
        </el-button>

        <p class="pay-tip">本平台为演示环境，点击按钮即完成模拟支付</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 16px 0;
}
.pay-card {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 24px;
  text-align: center;
}
.pay-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
}
.pay-amount {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-danger);
  margin-bottom: 24px;
}
.pay-info {
  text-align: left;
  margin-bottom: 32px;
  padding: 16px;
  background: var(--color-bg-muted);
  border-radius: var(--radius);
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}
.info-label {
  color: var(--color-text-secondary);
}
.info-value {
  color: var(--color-text);
  font-weight: 500;
}
.pay-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
}
.pay-tip {
  margin-top: 16px;
  font-size: 12px;
  color: var(--color-text-placeholder);
}

/* ========== 移动端 ========== */
@media (max-width: $bp-tablet) {
  .page-body {
    /* 支付页不显示底部 Tab Bar */
    padding: 12px 0 24px;
  }
  .pay-card {
    padding: 24px 16px;
  }
  .pay-amount { font-size: 30px; }
  .pay-info { margin-bottom: 24px; }
}
</style>

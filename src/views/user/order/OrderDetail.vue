<!--
  订单详情（views/user/order/OrderDetail.vue）
  知识点：
  1. 路由参数 route.params.orderNo
  2. orderApi.detail 拉取订单全量信息
  3. 信息分区：订单概览 / 票档明细 / 观演人 / 支付信息
  4. UNPAID 状态展示 PayCountdown + 支付按钮 -> /pay/:orderNo
  5. 取消订单（canCancel）/ 申请退款（canRefund）需 ElMessageBox.confirm 二次确认
  6. 敏感信息脱敏：maskPhone / maskIdCard
  7. 金额单位分 -> 元：formatMoneyWithSymbol
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api'
import type { OrderDetail } from '@/api/types'
import { OrderStatusTag, PayCountdown } from '@/components'
import { OrderStatus, canCancel, canPay, canRefund } from '@/utils/order-status'
import { formatDateTime, formatMoneyWithSymbol, maskPhone, maskIdCard } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const orderNo = route.params.orderNo as string
const loading = ref(true)
const detail = ref<OrderDetail | null>(null)

const payAmountText = computed(() =>
  detail.value ? formatMoneyWithSymbol(detail.value.payAmount) : ''
)
const isUnpaid = computed(() => detail.value?.status === OrderStatus.UNPAID)

/**
 * 订单状态进度条（PRD 7.1）
 * 按订单当前状态推导出步骤条：下单 → 支付 → 完成（或 取消 / 退款）
 * - UNPAID:  下单(完成) → 待支付(进行中) → 完成
 * - PAID:    下单(完成) → 已支付(完成) → 完成
 * - FINISHED:下单(完成) → 已支付(完成) → 完成(完成)
 * - CANCELED:下单(完成) → 已取消(出错)
 * - REFUNDING:下单 → 已支付 → 退款中(进行中) → 已退款
 * - REFUNDED: 下单 → 已支付 → 已退款(完成)
 */
const statusSteps = computed(() => {
  const s = detail.value?.status
  if (!s) return { steps: [] as string[], active: 0, status: 'process' as const }
  switch (s) {
    case OrderStatus.UNPAID:
      return { steps: ['下单', '待支付', '已完成'], active: 1, status: 'process' as const }
    case OrderStatus.PAID:
      return { steps: ['下单', '已支付', '已完成'], active: 2, status: 'process' as const }
    case OrderStatus.FINISHED:
      return { steps: ['下单', '已支付', '已完成'], active: 3, status: 'process' as const }
    case OrderStatus.CANCELED:
      return { steps: ['下单', '已取消'], active: 2, status: 'error' as const }
    case OrderStatus.REFUNDING:
      return { steps: ['下单', '已支付', '退款中', '已退款'], active: 2, status: 'process' as const }
    case OrderStatus.REFUNDED:
      return { steps: ['下单', '已支付', '已退款'], active: 3, status: 'process' as const }
    default:
      return { steps: ['下单'], active: 0, status: 'process' as const }
  }
})

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await orderApi.detail(orderNo)
  } finally {
    loading.value = false
  }
}

function goPay() {
  router.push(`/pay/${orderNo}`)
}

async function handleCancel() {
  try {
    await ElMessageBox.confirm(`确认取消订单 ${orderNo} 吗？`, '取消订单', {
      type: 'warning',
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想'
    })
    await orderApi.cancel(orderNo)
    ElMessage.success('订单已取消')
    fetchDetail()
  } catch {
    /* 用户取消确认 */
  }
}

async function handleRefund() {
  try {
    await ElMessageBox.confirm('确认申请退款吗？退款需等待管理员审批。', '申请退款', {
      type: 'warning',
      confirmButtonText: '确认申请',
      cancelButtonText: '再想想'
    })
    await orderApi.refund(orderNo)
    ElMessage.success('退款申请已提交')
    fetchDetail()
  } catch {
    /* 用户取消确认 */
  }
}

async function handleExpire() {
  // 倒计时归零 -> 调用后端超时关单接口，由后端更新订单状态
  // 然后重新拉取详情，isUnpaid 变 false 后 PayCountdown 不再渲染，避免死循环
  try {
    await orderApi.cancel(orderNo)
    ElMessage.warning('订单已关闭')
    await fetchDetail()
  } catch {
    // 关单失败兜底：直接改本地状态为 CANCELED，至少让 UI 不再显示支付按钮
    if (detail.value) {
      detail.value = { ...detail.value, status: OrderStatus.CANCELED }
    }
  }
}

onMounted(fetchDetail)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <el-skeleton v-if="loading" :rows="8" animated />
      <template v-else-if="detail">
        <section class="card section progress-section">
          <el-steps
            v-if="statusSteps.steps.length"
            :active="statusSteps.active"
            :process-status="statusSteps.status"
            finish-status="success"
            align-center
            :simple="true"
          >
            <el-step
              v-for="(title, i) in statusSteps.steps"
              :key="i"
              :title="title"
            />
          </el-steps>
        </section>

        <section class="card section">
          <div class="section-head">
            <h3 class="section-title">订单概览</h3>
            <OrderStatusTag :status="detail.status" size="large" />
          </div>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">订单号</span>
              <span class="info-value">{{ detail.orderNo }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">演出</span>
              <span class="info-value">{{ detail.eventTitle }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">场次时间</span>
              <span class="info-value">{{ formatDateTime(detail.showTime) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">场馆</span>
              <span class="info-value">{{ detail.venue }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">下单时间</span>
              <span class="info-value">{{ formatDateTime(detail.createTime) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">应付金额</span>
              <span class="info-value amount">{{ payAmountText }}</span>
            </div>
            <div v-if="detail.expireTime && isUnpaid" class="info-row">
              <span class="info-label">支付倒计时</span>
              <PayCountdown :expire-time="detail.expireTime" @expire="handleExpire" />
            </div>
            <div v-if="detail.payTime" class="info-row">
              <span class="info-label">支付时间</span>
              <span class="info-value">{{ formatDateTime(detail.payTime) }}</span>
            </div>
            <div v-if="detail.payNo" class="info-row">
              <span class="info-label">支付流水号</span>
              <span class="info-value">{{ detail.payNo }}</span>
            </div>
          </div>
        </section>

        <section class="card section">
          <h3 class="section-title">票档明细</h3>
          <div class="item-list">
            <div v-for="(item, i) in detail.items" :key="i" class="item-row">
              <div class="item-main">
                <div class="item-name">{{ item.categoryName }}</div>
                <div class="item-meta">
                  <span>单价 {{ formatMoneyWithSymbol(item.price) }}</span>
                  <span>× {{ item.quantity }}</span>
                </div>
                <div v-if="item.seatLabels && item.seatLabels.length" class="item-seats">
                  座位：{{ item.seatLabels.join('、') }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="detail.attendees && detail.attendees.length" class="card section">
          <h3 class="section-title">观演人信息</h3>
          <div class="attendee-list">
            <div v-for="(a, i) in detail.attendees" :key="i" class="attendee-row">
              <span class="att-name">{{ a.name }}</span>
              <span class="att-meta">{{ maskPhone(a.phone) }}</span>
              <span v-if="a.idCard" class="att-meta">{{ maskIdCard(a.idCard) }}</span>
            </div>
          </div>
        </section>

        <section class="card section actions">
          <el-button v-if="canPay(detail.status)" type="primary" size="large" @click="goPay">立即支付</el-button>
          <el-button v-if="canCancel(detail.status)" type="danger" size="large" @click="handleCancel">取消订单</el-button>
          <el-button v-if="canRefund(detail.status)" type="warning" size="large" @click="handleRefund">申请退款</el-button>
        </section>
      </template>

      <el-empty v-else description="订单不存在" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 8px 0 24px;
}
.section {
  padding: 16px 20px;
  margin-bottom: 16px;
}
.progress-section {
  padding: 20px 24px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}
.section-head .section-title {
  margin: 0;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 24px;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 14px;
}
.info-label {
  width: 80px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.info-value {
  color: var(--color-text);
}
.info-value.amount {
  font-weight: 700;
  color: var(--color-danger);
}
.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-row {
  padding: 10px 12px;
  background: var(--color-bg-muted);
  border-radius: var(--radius);
}
.item-name {
  font-weight: 600;
  font-size: 14px;
}
.item-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.item-seats {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.attendee-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.attendee-row {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}
.att-name {
  font-weight: 600;
  min-width: 80px;
}
.att-meta {
  color: var(--color-text-secondary);
}
.actions {
  display: flex;
  gap: 12px;
}

/* ========== 移动端（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .page-body {
    padding: 8px 0 calc(24px + 56px);
  }
  .section {
    padding: 14px;
    margin-bottom: 12px;
  }
  .progress-section {
    padding: 14px;
  }
  .section-title { font-size: 15px; }
  .info-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .info-row {
    padding: 5px 0;
    font-size: 13px;
  }
  .info-label { width: 72px; }
  /* 进度条：移动端纵向显示 */
  .progress-section :deep(.el-steps) {
    .el-step {
      flex: none;
    }
  }
  .actions {
    flex-direction: column;
    gap: 8px;
  }
  .actions :deep(.el-button) {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>

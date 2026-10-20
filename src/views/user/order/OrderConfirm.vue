<!--
  确认订单页（views/user/order/OrderConfirm.vue）—— 核心页面
  知识点：
  1. 跨页状态：从 cartStore 读取 sessionId/selectedSeats/currentCategoryId
  2. orderType 推断：selectedSeats.length>0 -> 'SEAT'，否则 'NORMAL'
  3. SEAT 模式：items 携带 seatIds，quantity=已选座位数；NORMAL 模式：数量选择器（上限 limitPerUser）
  4. 观演人表单：动态行数=数量，姓名/手机号必填、身份证选填；localStorage 草稿自动暂存（500ms 防抖）
  5. 幂等键：mount 时生成一次 genOrderKey()，下单 Header Idempotency-Key
  6. 下单 payload 绝不含价格字段（价格由后端计算）
  7. 下单成功 -> setCurrentOrder -> 跳转 /pay/:orderNo
-->
<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { sessionApi, orderApi } from '@/api'
import type { Attendee, CreateOrderRequest, OrderItem, TicketCategory } from '@/api/types'
import { useCartStore, useOrderStore } from '@/stores'
import { genOrderKey } from '@/utils/idempotency'
import { formatMoneyWithSymbol } from '@/utils/format'

const router = useRouter()
const cartStore = useCartStore()
const orderStore = useOrderStore()

/** 幂等键：mount 时生成一次，提交时携带 */
const idempotencyKey = ref(genOrderKey())

const categories = ref<TicketCategory[]>([])
const currentCategory = computed(
  () => categories.value.find((c) => c.id === cartStore.currentCategoryId) ?? null
)

/** 订单类型：有已选座位即 SEAT */
const orderType = computed<'NORMAL' | 'SEAT'>(() =>
  cartStore.selectedSeats.length > 0 ? 'SEAT' : 'NORMAL'
)

/** 是否无上下文（直接访问） */
const isEmpty = computed(
  () => cartStore.sessionId == null || cartStore.currentCategoryId == null
)

/* ============== NORMAL 模式数量 ============== */
const normalQuantity = ref(1)
const limitPerUser = computed(() => currentCategory.value?.limitPerUser ?? 4)

/* ============== 数量（驱动观演人行数） ============== */
const quantity = computed(() =>
  orderType.value === 'SEAT' ? cartStore.selectedSeats.length : normalQuantity.value
)

/* ============== 观演人列表 ============== */
interface AttendeeForm {
  name: string
  phone: string
  idCard: string
}
const attendees = reactive<AttendeeForm[]>([])

function ensureAttendees(size: number) {
  // 扩容
  while (attendees.length < size) {
    attendees.push({ name: '', phone: '', idCard: '' })
  }
  // 缩容
  if (attendees.length > size) {
    attendees.splice(size, attendees.length - size)
  }
}

// 数量变化同步行数
watch(quantity, (n) => ensureAttendees(n), { immediate: true })

/* ============== 已选座位展示 ============== */
const seatLabels = computed(() =>
  cartStore.selectedSeats.map((s) => `${s.row}${s.col}`).join('、')
)

/* ============== 合计金额 ============== */
const totalAmount = computed(() => {
  if (orderType.value === 'SEAT') {
    return cartStore.totalAmount
  }
  return (currentCategory.value?.price ?? 0) * normalQuantity.value
})
const totalText = computed(() => formatMoneyWithSymbol(totalAmount.value))

/* ============== 草稿自动暂存（500ms 防抖） ============== */
let draftTimer: number | null = null
watch(
  attendees,
  () => {
    if (draftTimer) window.clearTimeout(draftTimer)
    draftTimer = window.setTimeout(() => {
      orderStore.saveAttendeeDraft(
        attendees.map((a) => ({
          name: a.name,
          phone: a.phone,
          idCard: a.idCard || undefined
        }))
      )
    }, 500)
  },
  { deep: true }
)

/* ============== 提交订单 ============== */
const submitting = ref(false)

function validateAttendees(): boolean {
  for (let i = 0; i < attendees.length; i++) {
    const a = attendees[i]
    if (!a.name.trim()) {
      ElMessage.error(`请填写第 ${i + 1} 位观演人姓名`)
      return false
    }
    if (!a.phone.trim()) {
      ElMessage.error(`请填写第 ${i + 1} 位观演人手机号`)
      return false
    }
    if (!/^1\d{10}$/.test(a.phone.trim())) {
      ElMessage.error(`第 ${i + 1} 位观演人手机号格式不正确`)
      return false
    }
  }
  return true
}

async function handleSubmit() {
  if (cartStore.sessionId == null || cartStore.currentCategoryId == null) {
    ElMessage.warning('请先选择场次与票档')
    return
  }
  if (!validateAttendees()) return

  // 构造订单项：SEAT 模式按票档分组座位，每票档一个订单项（支持跨票档合计付款）
  let items: OrderItem[]
  if (orderType.value === 'SEAT') {
    const grouped = new Map<number, number[]>()
    for (const seat of cartStore.selectedSeats) {
      const catId = seat.categoryId!
      const arr = grouped.get(catId) ?? []
      arr.push(seat.id)
      grouped.set(catId, arr)
    }
    items = Array.from(grouped.entries()).map(([catId, seatIds]) => ({
      ticketCategoryId: catId,
      quantity: seatIds.length,
      seatIds
    }))
  } else {
    items = [
      {
        ticketCategoryId: cartStore.currentCategoryId,
        quantity: quantity.value,
        seatIds: undefined
      }
    ]
  }
  const payloadAttendees: Attendee[] = attendees.map((a) => ({
    name: a.name.trim(),
    phone: a.phone.trim(),
    idCard: a.idCard.trim() || undefined
  }))
  const payload: CreateOrderRequest = {
    sessionId: cartStore.sessionId,
    orderType: orderType.value,
    items,
    attendees: payloadAttendees
  }

  submitting.value = true
  try {
    const res = await orderApi.create(payload, idempotencyKey.value)
    orderStore.setCurrentOrder(res)
    orderStore.clearAttendeeDraft()
    ElMessage.success('下单成功，即将前往支付')
    router.push(`/pay/${res.orderNo}`)
  } finally {
    submitting.value = false
  }
}

/* ============== 初始化 ============== */
async function init() {
  if (isEmpty.value) return
  // 拉票档列表，取当前票档的 limitPerUser/price/名称
  try {
    categories.value = await sessionApi.categories(cartStore.sessionId!)
  } catch {
    /* 拦截器已弹错 */
  }
  // NORMAL 模式数量上限兜底
  if (normalQuantity.value > limitPerUser.value) {
    normalQuantity.value = limitPerUser.value
  }
  ensureAttendees(quantity.value)
  // 预填草稿
  const draft = orderStore.loadAttendeeDraft<AttendeeForm[]>()
  if (draft && draft.length) {
    draft.forEach((d, i) => {
      if (i < attendees.length) {
        attendees[i] = { name: d.name || '', phone: d.phone || '', idCard: d.idCard || '' }
      }
    })
  }
}

function goSelectSeat() {
  router.push('/events')
}

onMounted(init)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <el-empty v-if="isEmpty" description="请先选择场次与票档">
        <el-button type="primary" @click="goSelectSeat">去选座</el-button>
      </el-empty>

      <template v-else>
        <!-- 订单概览 -->
        <section class="card section">
          <h3 class="section-title">订单信息</h3>
          <div class="info-row">
            <span class="info-label">票档</span>
            <span class="info-value">{{ currentCategory?.name ?? '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">购买方式</span>
            <span class="info-value">{{ orderType === 'SEAT' ? '选座购票' : '普通购票' }}</span>
          </div>
          <div v-if="orderType === 'SEAT'" class="info-row">
            <span class="info-label">已选座位</span>
            <span class="info-value seats">{{ seatLabels || '-' }}</span>
          </div>
          <div v-else class="info-row">
            <span class="info-label">购买数量</span>
            <div class="qty-control">
              <el-button
                size="small"
                circle
                :disabled="normalQuantity <= 1"
                @click="normalQuantity--"
              >-</el-button>
              <span class="qty-num">{{ normalQuantity }}</span>
              <el-button
                size="small"
                circle
                :disabled="normalQuantity >= limitPerUser"
                @click="normalQuantity++"
              >+</el-button>
              <span class="qty-tip">（限购 {{ limitPerUser }} 张）</span>
            </div>
          </div>
        </section>

        <!-- 观演人信息 -->
        <section class="card section">
          <h3 class="section-title">观演人信息</h3>
          <div v-for="(a, i) in attendees" :key="i" class="attendee-block">
            <div class="attendee-title">观演人 {{ i + 1 }}</div>
            <div class="attendee-form">
              <div class="form-item">
                <label class="form-label">姓名 <span class="required">*</span></label>
                <el-input v-model="a.name" placeholder="请输入姓名" maxlength="30" />
              </div>
              <div class="form-item">
                <label class="form-label">手机号 <span class="required">*</span></label>
                <el-input v-model="a.phone" placeholder="11 位手机号" maxlength="11" />
              </div>
              <div class="form-item">
                <label class="form-label">身份证</label>
                <el-input v-model="a.idCard" placeholder="选填" maxlength="18" />
              </div>
            </div>
          </div>
        </section>

        <!-- 合计 -->
        <section class="card section summary">
          <div class="summary-row">
            <span>合计</span>
            <span class="summary-amount">{{ totalText }}</span>
          </div>
        </section>
      </template>
    </div>

    <div v-if="!isEmpty" class="bottom-bar safe-area-bottom">
      <div class="bar-amount">
        <span class="bar-label">应付</span>
        <span class="bar-total">{{ totalText }}</span>
      </div>
      <el-button
        type="primary"
        size="large"
        :loading="submitting"
        @click="handleSubmit"
      >
        提交订单
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 8px 0 96px;
}
.section {
  padding: 16px 20px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}
.info-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}
.info-label {
  width: 90px;
  color: var(--color-text-secondary);
}
.info-value {
  color: var(--color-text);
}
.info-value.seats {
  font-weight: 600;
}
.qty-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qty-num {
  min-width: 32px;
  text-align: center;
  font-weight: 600;
}
.qty-tip {
  font-size: 12px;
  color: var(--color-text-placeholder);
}
.attendee-block {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-bottom: 12px;
}
.attendee-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 10px;
}
.attendee-form {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.required {
  color: var(--color-danger);
}
.summary-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 12px;
}
.summary-amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-danger);
}
.bar-amount {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.bar-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.bar-total {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-danger);
}
/* ========== 移动端（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .page-body {
    padding: 8px 0 calc(120px + 56px);
  }
  .section {
    padding: 14px;
    margin-bottom: 12px;
  }
  .info-label { width: 76px; }
  .attendee-form {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .summary-amount { font-size: 18px; }
  /* 吸底栏上移，避开底部 Tab Bar */
  .bottom-bar {
    height: auto;
    min-height: 56px;
    padding: 8px 12px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    bottom: calc(56px + env(safe-area-inset-bottom));
  }
  .bar-amount { justify-content: space-between; }
  .bottom-bar :deep(.el-button) { width: 100%; }
}
</style>

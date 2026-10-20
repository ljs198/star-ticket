<!--
  场次详情页（views/user/session/SessionDetail.vue）
  知识点：
  1. 路由参数 route.params.id 为场次 ID（sessionId）
  2. sessionApi.detail(sessionId) 拿场次信息，sessionApi.categories(sessionId) 拿票档列表
  3. 票档操作分流（场次状态机）：
     - ON_SALE 且 remaining>0 -> “选座”按钮 -> /seats/:sessionId?categoryId=...
     - NOT_STARTED -> “预约”按钮 -> reservationApi.create({sessionId, categoryId})
     - ENDED/SOLD_OUT -> “已结束/已售罄”禁用
  4. 金额单位分 -> 元：formatMoneyWithSymbol
  5. 预约成功后该票档按钮置灰，避免重复预约
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { sessionApi, reservationApi } from '@/api'
import type { SessionItem, TicketCategory } from '@/api/types'
import { formatDateTime, formatMoneyWithSymbol } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const sessionId = computed(() => Number(route.params.id))
const loading = ref(false)
const session = ref<SessionItem | null>(null)
const categories = ref<TicketCategory[]>([])

/** 已预约的票档 ID 集合（按钮置灰，避免重复预约） */
const reservedSet = reactive<Set<number>>(new Set())

/** 场次是否在售 */
const isOnSale = computed(() => session.value?.status === 'ON_SALE')
/** 场次是否未开售（可预约） */
const isNotStarted = computed(() => session.value?.status === 'NOT_STARTED')
/** 场次是否已售罄（可到货提醒） */
const isSoldOut = computed(() => session.value?.status === 'SOLD_OUT')

/* ============== 开售倒计时（PRD 7.1：未开售场次展示开售倒计时） ============== */
const countdownText = ref('')
const saleStarted = ref(false)
let countdownTimer: number | null = null

/** 格式化剩余毫秒为 天 时分秒 */
function formatRemain(ms: number): string {
  if (ms <= 0) return '即将开售'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (d > 0) return `${d}天 ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function startCountdown() {
  if (countdownTimer) window.clearInterval(countdownTimer)
  const startMs = session.value?.saleStartTime
    ? new Date(session.value.saleStartTime).getTime()
    : NaN
  if (!startMs || Number.isNaN(startMs)) return
  const tick = () => {
    const remain = startMs - Date.now()
    countdownText.value = formatRemain(remain)
    if (remain <= 0) {
      saleStarted.value = true
      if (countdownTimer) window.clearInterval(countdownTimer)
      countdownTimer = null
      // 开售到点 -> 重新拉取，让后端把状态推到 ON_SALE
      fetchData()
    }
  }
  tick()
  countdownTimer = window.setInterval(tick, 1000)
}

async function fetchData() {
  loading.value = true
  try {
    const id = sessionId.value
    session.value = await sessionApi.detail(id)
    categories.value = await sessionApi.categories(id)
    // 未开售且开售时间在未来 -> 启动倒计时
    if (session.value?.status === 'NOT_STARTED' && session.value.saleStartTime) {
      const startMs = new Date(session.value.saleStartTime).getTime()
      // 仅当开售时间在未来时才启动倒计时，避免到点后后端未转在售导致无限循环
      if (!Number.isNaN(startMs) && startMs > Date.now()) {
        startCountdown()
      }
    }
  } finally {
    loading.value = false
  }
}

/** 选座 -> 跳转选座页 */
function goSelectSeat(categoryId: number) {
  router.push({ path: `/seats/${sessionId.value}`, query: { categoryId: String(categoryId) } })
}

/** 预约未开售票档 / 售罄场次到货提醒 */
async function handleReserve(category: TicketCategory) {
  try {
    await reservationApi.create({ sessionId: sessionId.value, categoryId: category.id })
    ElMessage.success(isSoldOut.value ? '已设置到货提醒，有票时将通知您' : '预约成功，开售后将通知您')
    reservedSet.add(category.id)
  } catch {
    /* 拦截器已弹错 */
  }
}

/** 票档按钮文案 */
function btnText(c: TicketCategory): string {
  if (isOnSale.value) {
    return c.remainingQuantity > 0 ? '选座' : '已售罄'
  }
  if (isNotStarted.value) {
    return reservedSet.has(c.id) ? '已预约' : '预约'
  }
  if (isSoldOut.value) {
    return reservedSet.has(c.id) ? '已提醒' : '到货提醒'
  }
  // ENDED -> 已结束
  return '已结束'
}

/** 票档按钮是否禁用 */
function btnDisabled(c: TicketCategory): boolean {
  if (isOnSale.value) {
    return c.remainingQuantity <= 0
  }
  if (isNotStarted.value || isSoldOut.value) {
    return reservedSet.has(c.id)
  }
  return true
}

function goBack() {
  if (session.value) {
    router.push(`/events/${session.value.eventId}`)
  } else {
    router.push('/events')
  }
}

/** 组件卸载清理倒计时 */
onUnmounted(() => {
  if (countdownTimer) window.clearInterval(countdownTimer)
})

onMounted(fetchData)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <el-skeleton v-if="loading" :rows="6" animated />
      <template v-else-if="session">
        <div class="session-hero card">
          <div class="hero-left">
            <h1 class="title">场次详情</h1>
            <p class="meta">演出时间：{{ formatDateTime(session.showTime) }}</p>
            <p class="meta">场馆：{{ session.venue }}</p>
            <p class="meta">
              状态：
              <el-tag
                size="small"
                :type="isOnSale ? 'success' : isNotStarted ? 'warning' : 'info'"
              >
                {{ isOnSale ? '在售' : isNotStarted ? '未开售' : session.status === 'ENDED' ? '已结束' : '已售罄' }}
              </el-tag>
            </p>
            <p v-if="isNotStarted && session.saleStartTime" class="meta sale-countdown">
              开售时间：{{ formatDateTime(session.saleStartTime) }}
              <span v-if="countdownText" class="countdown-box">
                距开售 <strong>{{ countdownText }}</strong>
              </span>
            </p>
          </div>
          <el-button link @click="goBack">← 返回演出</el-button>
        </div>

        <h3 class="section-title">票档选择</h3>
        <el-empty v-if="!categories.length" description="暂无票档" />
        <div v-else class="category-list">
          <div v-for="c in categories" :key="c.id" class="category-item card">
            <div class="cat-main">
              <div class="cat-name">
                {{ c.name }}
                <span class="cat-color" v-if="c.color" :style="{ background: c.color }"></span>
              </div>
              <div class="cat-price">{{ formatMoneyWithSymbol(c.price) }}</div>
              <div class="cat-meta">
                <span>剩余 {{ c.remainingQuantity }}</span>
                <span>限购 {{ c.limitPerUser }} 张</span>
              </div>
              <div v-if="c.description" class="cat-desc">{{ c.description }}</div>
            </div>
            <div class="cat-action">
              <el-button
                type="primary"
                :disabled="btnDisabled(c)"
                @click="isOnSale && c.remainingQuantity > 0 ? goSelectSeat(c.id) : handleReserve(c)"
              >
                {{ btnText(c) }}
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <el-empty v-else description="场次不存在" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 8px 0 24px;
}
.session-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px;
  margin-bottom: 20px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 12px;
}
.meta {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 6px 0;
}
.sale-countdown {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.countdown-box {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: var(--color-warning-bg, #fdf6ec);
  color: var(--color-warning);
  border-radius: var(--radius);
  font-size: 13px;
  strong {
    color: var(--color-danger);
    font-size: 15px;
    margin-left: 2px;
    font-variant-numeric: tabular-nums;
  }
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}
.category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}
.cat-main {
  flex: 1;
  min-width: 0;
}
.cat-name {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cat-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.cat-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-danger);
  margin: 4px 0;
}
.cat-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.cat-desc {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin-top: 4px;
}
/* ========== 移动端（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .session-hero {
    padding: 14px;
    flex-direction: column;
    gap: 10px;
  }
  .title { font-size: 17px; }
  .category-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
  }
  .cat-action {
    width: 100%;
    :deep(.el-button) {
      width: 100%;
    }
  }
  .countdown-box {
    font-size: 12px;
    padding: 2px 8px;
  }
}
</style>

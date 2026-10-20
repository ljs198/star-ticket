<!--
  演出详情页（views/user/event/EventDetail.vue）
  知识点：
  1. 路由参数：useRoute().params.id 拿到演出 ID
  2. 海报 hero 区 + 标题/场馆/城市/演出时间/价格区间/描述/状态标签
  3. 底部固定操作栏：ON_SALE 显示“查看场次”，SOLD_OUT/END 显示禁用按钮
  4. 演出下场次列表（sessionApi.listByEvent）：用于导航到具体场次的 /sessions/:sessionId
     （EventDetail 仅用 eventApi.detail，但为打通“演出 -> 场次”导航，额外拉取场次列表）
  5. 金额单位分 -> 元：formatMoneyWithSymbol
  6. 日期统一 formatDateTime（yyyy-MM-dd HH:mm:ss 东八区）
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventApi, sessionApi } from '@/api'
import type { EventItem, SessionItem } from '@/api/types'
import { formatDateTime, formatMoneyWithSymbol } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<EventItem | null>(null)
const sessions = ref<SessionItem[]>([])

const statusText = computed(() => {
  switch (detail.value?.status) {
    case 'ON_SALE':
      return '在售'
    case 'SOLD_OUT':
      return '售罄'
    case 'END':
      return '已结束'
    case 'DRAFT':
      return '未上架'
    default:
      return ''
  }
})

const statusType = computed<'success' | 'info' | 'warning'>(() => {
  switch (detail.value?.status) {
    case 'ON_SALE':
      return 'success'
    case 'SOLD_OUT':
      return 'warning'
    case 'END':
      return 'info'
    default:
      return 'info'
  }
})

/** 是否在售：决定底部按钮可用性 */
const isOnSale = computed(() => detail.value?.status === 'ON_SALE')

/** 场次状态文案 */
function sessionStatusText(status: SessionItem['status']): string {
  switch (status) {
    case 'ON_SALE': return '在售'
    case 'NOT_STARTED': return '未开售'
    case 'SOLD_OUT': return '已售罄'
    case 'ENDED': return '已结束'
    default: return status
  }
}

/** 场次状态标签类型 */
function sessionStatusType(status: SessionItem['status']): 'success' | 'warning' | 'info' {
  switch (status) {
    case 'ON_SALE': return 'success'
    case 'SOLD_OUT':
    case 'NOT_STARTED': return 'warning'
    default: return 'info'
  }
}

const priceText = computed(() => {
  if (!detail.value) return ''
  const { minPrice, maxPrice } = detail.value
  if (minPrice == null) return '待定'
  if (maxPrice && maxPrice !== minPrice) {
    return `${formatMoneyWithSymbol(minPrice)} - ${formatMoneyWithSymbol(maxPrice)}`
  }
  return formatMoneyWithSymbol(minPrice)
})

async function fetchDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    detail.value = await eventApi.detail(id)
    // 拉取演出下场次列表，用于导航到具体场次（场次详情页需要 sessionId）
    try {
      sessions.value = await sessionApi.listByEvent(id)
    } catch {
      sessions.value = []
    }
  } catch {
    // 演出不存在或已下架 -> detail 保持 null，模板展示"演出不存在"
    detail.value = null
  } finally {
    loading.value = false
  }
}

/** 查看场次：进入第一个可售场次详情页 */
function goSessions() {
  if (!sessions.value.length) return
  const target = sessions.value[0]
  router.push(`/sessions/${target.id}`)
}

/** 直接进入指定场次 */
function goSession(sessionId: number) {
  router.push(`/sessions/${sessionId}`)
}

onMounted(fetchDetail)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <el-skeleton v-if="loading" :rows="8" animated />
      <template v-else-if="detail">
        <div class="hero card">
          <div class="poster">
            <img v-if="detail.poster" :src="detail.poster" :alt="detail.title" />
            <div v-else class="poster-placeholder">暂无海报</div>
          </div>
          <div class="info">
            <div class="info-header">
              <h1 class="title">{{ detail.title }}</h1>
              <el-tag :type="statusType" effect="dark" size="small">{{ statusText }}</el-tag>
            </div>
            <p class="meta">
              <span>{{ detail.venue }}</span>
              <span v-if="detail.city"> · {{ detail.city }}</span>
              <span v-if="detail.category"> · {{ detail.category }}</span>
            </p>
            <p v-if="detail.showTime" class="meta">
              演出时间：{{ formatDateTime(detail.showTime) }}
            </p>
            <p class="meta price">价格：{{ priceText }}</p>
            <p v-if="detail.description" class="desc">{{ detail.description }}</p>
          </div>
        </div>

        <section v-if="sessions.length" class="sessions card">
          <h3 class="section-title">演出场次</h3>
          <div class="session-list">
            <div
              v-for="s in sessions"
              :key="s.id"
              class="session-item"
              @click="goSession(s.id)"
            >
              <div class="session-time">{{ formatDateTime(s.showTime) }}</div>
              <div class="session-meta">
                <span>{{ s.venue }}</span>
                <el-tag
                  size="small"
                  :type="sessionStatusType(s.status)"
                >
                  {{ sessionStatusText(s.status) }}
                </el-tag>
              </div>
              <span class="session-arrow">查看 →</span>
            </div>
          </div>
        </section>
      </template>

      <el-empty v-else description="演出不存在或已下架" />
    </div>

    <div v-if="detail" class="bottom-bar safe-area-bottom">
      <div class="bottom-price">价格 {{ priceText }}</div>
      <el-button
        type="primary"
        size="large"
        :disabled="!isOnSale || !sessions.length"
        @click="goSessions"
      >
        {{ isOnSale ? '查看场次' : '暂不可购' }}
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 8px 0 96px;
}
.hero {
  display: flex;
  gap: 24px;
  padding: 20px;
  margin-bottom: 16px;
}
.poster {
  flex: 0 0 220px;
  aspect-ratio: 3 / 4;
  background: var(--color-bg-muted);
  border-radius: var(--radius);
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-placeholder);
  font-size: 14px;
}
.info {
  flex: 1;
  min-width: 0;
}
.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}
.meta {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 4px 0;
}
.price {
  color: var(--color-danger);
  font-weight: 600;
}
.desc {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.7;
  margin-top: 12px;
  white-space: pre-wrap;
}
.sessions {
  padding: 20px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}
.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.session-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: var(--color-primary);
    background: var(--color-bg-muted);
  }
}
.session-time {
  font-weight: 600;
  color: var(--color-text);
}
.session-meta {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.session-arrow {
  color: var(--color-primary);
  font-size: 13px;
}
.bottom-bar {
  justify-content: space-between;
}
.bottom-price {
  font-size: 14px;
  color: var(--color-text-secondary);
}
/* ========== 移动端（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .page-body {
    padding: 8px 0 calc(120px + 56px);
  }
  .hero {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  .poster {
    flex: none;
    width: 100%;
    margin: 0;
    aspect-ratio: 16 / 9;
  }
  .title { font-size: 18px; }
  .info-header { gap: 8px; }
  .sessions { padding: 12px; }
  .session-item {
    padding: 10px 12px;
    gap: 8px;
  }
  .session-meta { font-size: 12px; }
  /* 吸底栏上移，避开底部 Tab Bar */
  .bottom-bar {
    height: auto;
    min-height: 56px;
    padding: 8px 12px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
    bottom: calc(56px + env(safe-area-inset-bottom));
  }
  .bottom-price { text-align: center; }
}
</style>

<!--
  演出卡片（components/event/EventCard.vue）
  知识点：
  1. 卡片布局：海报 + 标题 + 时间 + 场馆 + 价格 + 状态
  2. router-link 跳转到详情页
  3. 价格区间来自后端 minPrice/maxPrice
  4. status 状态：ON_SALE / SOLD_OUT / END，影响"立即购买"按钮
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatMoneyWithSymbol, formatDateTime } from '@/utils/format'
import type { EventItem } from '@/api/types'

interface Props {
  event: EventItem
}

const props = defineProps<Props>()
const router = useRouter()

const statusText = computed(() => {
  switch (props.event.status) {
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
  switch (props.event.status) {
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

const priceText = computed(() => {
  const { minPrice, maxPrice } = props.event
  if (minPrice == null) return '待定'
  if (maxPrice && maxPrice !== minPrice) {
    return `${formatMoneyWithSymbol(minPrice!)} - ${formatMoneyWithSymbol(maxPrice)}`
  }
  return formatMoneyWithSymbol(minPrice!)
})

function goDetail() {
  router.push(`/events/${props.event.id}`)
}
</script>

<template>
  <div class="event-card card" @click="goDetail">
    <div class="poster">
      <img v-if="props.event.poster" :src="props.event.poster" :alt="props.event.title" />
      <div v-else class="poster-placeholder">暂无海报</div>
      <el-tag class="status" :type="statusType" effect="dark" size="small">
        {{ statusText }}
      </el-tag>
    </div>
    <div class="content">
      <h3 class="title text-ellipsis">{{ props.event.title }}</h3>
      <p class="meta">
        <span>{{ props.event.venue }}</span>
        <span v-if="props.event.city"> · {{ props.event.city }}</span>
      </p>
      <p v-if="props.event.showTime" class="time">
        {{ formatDateTime(props.event.showTime) }}
      </p>
      <div class="footer">
        <span class="price">{{ priceText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.event-card {
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}
.poster {
  position: relative;
  aspect-ratio: 3 / 4;
  background: var(--color-bg-muted);
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
.status {
  position: absolute;
  top: 8px;
  right: 8px;
}
.content {
  padding: 12px;
}
.title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.time {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.price {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-danger);
}

/* ========== 移动端 ========== */
@media (max-width: $bp-tablet) {
  .content { padding: 10px; }
  .title { font-size: 13px; }
  .meta, .time { font-size: 11px; }
  .price { font-size: 14px; }
  .event-card:hover { transform: none; }
}
</style>

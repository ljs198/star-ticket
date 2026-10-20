<!--
  首页（views/user/home/Home.vue）
  参考大麦网 + 猫眼电影布局：
  1. 轮播图 Banner（可点击跳转演出详情）
  2. 分类图标导航（10 个分类）
  3. 热门演出网格 + 右侧热度排行榜
  4. 国庆主题配色（红金）
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { eventApi } from '@/api'
import type { EventItem, PageResult } from '@/api/types'
import { EventCard, CategoryIcon } from '@/components'
import { mockBanners, mockCategoryIcons } from '@/mock/data'

const router = useRouter()
const loading = ref(false)
const hotEvents = ref<EventItem[]>([])

/** 轮播图当前索引 */
const bannerIndex = ref(0)
let bannerTimer: number | null = null

/** 热度排行榜（按 minPrice 模拟热度排序） */
const ranking = computed(() => {
  return [...hotEvents.value]
    .sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0))
    .slice(0, 10)
})

async function fetchHotEvents() {
  loading.value = true
  try {
    const res: PageResult<EventItem> = await eventApi.list({ page: 1, size: 20 })
    hotEvents.value = res.records ?? []
  } finally {
    loading.value = false
  }
}

/** 点击轮播图跳转到演出详情 */
function goEventDetail(eventId: number) {
  router.push(`/events/${eventId}`)
}

/** 点击分类图标跳转到演出列表 */
function goCategory(category: string) {
  router.push({ path: '/events', query: { category } })
}

/** 轮播图自动播放 */
function startBannerTimer() {
  if (bannerTimer) window.clearInterval(bannerTimer)
  bannerTimer = window.setInterval(() => {
    bannerIndex.value = (bannerIndex.value + 1) % mockBanners.length
  }, 4000)
}

function onBannerEnter(index: number) {
  bannerIndex.value = index
  if (bannerTimer) {
    window.clearInterval(bannerTimer)
    bannerTimer = null
  }
}

function onBannerLeave() {
  startBannerTimer()
}

function prevBanner() {
  bannerIndex.value = (bannerIndex.value - 1 + mockBanners.length) % mockBanners.length
}
function nextBanner() {
  bannerIndex.value = (bannerIndex.value + 1) % mockBanners.length
}

onMounted(() => {
  fetchHotEvents()
  startBannerTimer()
})
</script>

<template>
  <div class="home-page">
    <!-- 轮播图 -->
    <section
      class="banner-section"
      @mouseenter="onBannerEnter(bannerIndex)"
      @mouseleave="onBannerLeave"
    >
      <div class="banner-track" :style="{ transform: `translateX(-${bannerIndex * 100}%)` }">
        <div
          v-for="b in mockBanners"
          :key="b.id"
          class="banner-slide"
          @click="goEventDetail(b.eventId)"
        >
          <img :src="b.image" :alt="b.title" class="banner-img" />
          <div class="banner-overlay">
            <div class="banner-content">
              <h2 class="banner-title">{{ b.title }}</h2>
              <p class="banner-subtitle">{{ b.subtitle }}</p>
              <el-button class="banner-btn" type="primary">立即抢购</el-button>
            </div>
          </div>
        </div>
      </div>
      <!-- 左右箭头 -->
      <button class="banner-arrow prev" @click="prevBanner">‹</button>
      <button class="banner-arrow next" @click="nextBanner">›</button>
      <!-- 指示器 -->
      <div class="banner-dots">
        <span
          v-for="(b, i) in mockBanners"
          :key="b.id"
          class="dot"
          :class="{ active: i === bannerIndex }"
          @click="bannerIndex = i"
        />
      </div>
    </section>

    <!-- 分类图标 -->
    <section class="category-section">
      <div class="category-grid">
        <div
          v-for="c in mockCategoryIcons"
          :key="c.id"
          class="category-item"
          @click="goCategory(c.category)"
        >
          <div class="category-icon-wrap">
            <CategoryIcon :name="c.icon" :size="32" />
          </div>
          <span class="category-name">{{ c.name }}</span>
        </div>
      </div>
    </section>

    <!-- 主内容区：热门演出 + 排行榜 -->
    <section class="main-content">
      <div class="content-left">
        <div class="section-header">
          <h3 class="section-title">
            <span class="title-bar"></span>
            热门演出
            <span class="title-count">({{ hotEvents.length }}场)</span>
          </h3>
          <router-link to="/events" class="more-link">全部 ›</router-link>
        </div>
        <div v-if="loading" class="loading-tip">加载中...</div>
        <div v-else class="event-grid">
          <EventCard v-for="item in hotEvents.slice(0, 8)" :key="item.id" :event="item" />
        </div>

        <div class="section-header">
          <h3 class="section-title">
            <span class="title-bar gold"></span>
            即将开售
          </h3>
          <router-link to="/events" class="more-link">全部 ›</router-link>
        </div>
        <div v-if="loading" class="loading-tip">加载中...</div>
        <div v-else class="event-grid">
          <EventCard v-for="item in hotEvents.slice(8, 16)" :key="item.id" :event="item" />
        </div>
      </div>

      <!-- 右侧排行榜 -->
      <aside class="content-right">
        <div class="ranking-card">
          <div class="ranking-header">
            <h3 class="ranking-title">
              <span class="ranking-icon">🏆</span>
              热度排行榜
            </h3>
          </div>
          <div class="ranking-list">
            <div
              v-for="(item, i) in ranking"
              :key="item.id"
              class="ranking-item"
              @click="goEventDetail(item.id)"
            >
              <span class="rank-num" :class="{ top3: i < 3 }">{{ i + 1 }}</span>
              <img :src="item.poster" :alt="item.title" class="rank-poster" />
              <div class="rank-info">
                <div class="rank-title">{{ item.title }}</div>
                <div class="rank-meta">
                  <span class="rank-city">{{ item.city }}</span>
                  <span class="rank-price">¥{{ ((item.minPrice ?? 0) / 100).toFixed(0) }}起</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 国庆活动卡片 -->
        <div class="promo-card">
          <div class="promo-tag">国庆特惠</div>
          <h4 class="promo-title">满 300 减 50</h4>
          <p class="promo-desc">精选演出限时优惠</p>
          <el-button class="promo-btn" type="primary" @click="router.push('/events')">
            立即抢购
          </el-button>
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  padding: 16px 0 40px;
}

/* ========== 轮播图 ========== */
.banner-section {
  position: relative;
  width: 100%;
  height: 360px;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(200, 16, 46, 0.15);
}
.banner-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
}
.banner-slide {
  flex: 0 0 100%;
  position: relative;
  cursor: pointer;
}
.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 60%);
  display: flex;
  align-items: center;
}
.banner-content {
  padding-left: 48px;
  color: #fff;
}
.banner-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.5);
}
.banner-subtitle {
  font-size: 16px;
  margin: 0 0 20px;
  opacity: 0.9;
}
.banner-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-gold)) !important;
  border: none;
  font-weight: 600;
}
.banner-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  &:hover { background: rgba(0, 0, 0, 0.6); }
  &.prev { left: 16px; }
  &.next { right: 16px; }
}
.banner-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
  &.active {
    background: var(--color-gold);
    width: 24px;
    border-radius: 5px;
  }
}

/* ========== 分类图标 ========== */
.category-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 16px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-card);
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 12px;
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 4px;
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    background: rgba(200, 16, 46, 0.06);
    transform: translateY(-2px);
  }
}
.category-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(200,16,46,0.1), rgba(212,175,55,0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}
.category-name {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
}

/* ========== 主内容区 ========== */
.main-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.content-left {
  flex: 1;
  min-width: 0;
}
.content-right {
  width: 300px;
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 16px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
}
.title-bar {
  width: 4px;
  height: 20px;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light));
  border-radius: 2px;
  &.gold { background: linear-gradient(180deg, var(--color-gold), var(--color-gold-light)); }
}
.title-count {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-placeholder);
}
.more-link {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-decoration: none;
  &:hover { color: var(--color-primary); }
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.loading-tip {
  text-align: center;
  padding: 40px;
  color: var(--color-text-placeholder);
}

/* ========== 排行榜 ========== */
.ranking-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  border-top: 3px solid var(--color-gold);
}
.ranking-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(200,16,46,0.05), rgba(212,175,55,0.08));
  border-bottom: 1px solid var(--color-border);
}
.ranking-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: var(--color-primary);
}
.ranking-icon { font-size: 18px; }
.ranking-list {
  padding: 8px 0;
}
.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: var(--color-bg-muted); }
}
.rank-num {
  width: 22px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
  &.top3 {
    color: var(--color-primary);
    font-size: 17px;
  }
}
.rank-poster {
  width: 48px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}
.rank-info {
  flex: 1;
  min-width: 0;
}
.rank-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  margin-bottom: 4px;
}
.rank-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.rank-city { color: var(--color-text-placeholder); }
.rank-price { color: var(--color-primary); font-weight: 600; }

/* ========== 国庆活动卡片 ========== */
.promo-card {
  margin-top: 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-radius: 12px;
  padding: 24px 20px;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(200, 16, 46, 0.3);
}
.promo-card::before {
  content: '';
  position: absolute;
  top: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.3);
}
.promo-tag {
  display: inline-block;
  background: var(--color-gold);
  color: var(--color-primary-dark);
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 10px;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}
.promo-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 6px;
  position: relative;
  z-index: 1;
}
.promo-desc {
  font-size: 13px;
  opacity: 0.9;
  margin: 0 0 16px;
  position: relative;
  z-index: 1;
}
.promo-btn {
  background: #fff !important;
  color: var(--color-primary) !important;
  border: none;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

/* ========== 移动端适配（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .home-page {
    padding: 12px 0 24px;
  }
  /* 轮播图 */
  .banner-section {
    height: 160px;
    border-radius: 10px;
    margin-bottom: 12px;
  }
  .banner-content { padding-left: 20px; }
  .banner-title { font-size: 16px; margin-bottom: 6px; }
  .banner-subtitle { font-size: 12px; margin-bottom: 10px; }
  .banner-btn {
    padding: 6px 14px !important;
    font-size: 12px !important;
  }
  .banner-arrow { display: none; } /* 移动端用滑动，隐藏箭头 */
  .banner-dots { bottom: 8px; }
  .dot { width: 6px; height: 6px; }
  .dot.active { width: 16px; }

  /* 分类图标：改为横向滚动 */
  .category-section {
    padding: 12px 0;
    margin-bottom: 12px;
    border-radius: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .category-grid {
    display: flex;
    grid-template-columns: none;
    gap: 0;
    width: max-content;
    padding: 0 8px;
  }
  .category-item {
    width: 64px;
    flex-shrink: 0;
    padding: 6px 0;
  }
  .category-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }
  .category-name { font-size: 11px; }

  /* 主内容区：左右改单列 */
  .main-content {
    flex-direction: column;
    gap: 12px;
  }
  .content-right { width: 100%; }
  .section-header { margin: 16px 0 10px; }
  .section-title { font-size: 16px; }
  .title-bar { height: 16px; }
  .event-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  /* 排行榜：横向滚动卡片 */
  .ranking-card { border-radius: 10px; }
  .ranking-header { padding: 12px 14px; }
  .ranking-title { font-size: 15px; }
  .ranking-list {
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 10px 8px;
    scroll-snap-type: x mandatory;
  }
  .ranking-item {
    position: relative;
    flex: 0 0 140px;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 8px;
    scroll-snap-align: start;
  }
  .rank-num {
    position: absolute;
    top: 8px; left: 8px;
    background: rgba(0,0,0,0.5);
    color: #fff;
    border-radius: 4px;
    padding: 0 4px;
    font-size: 11px;
    width: auto;
  }
  .rank-poster {
    width: 100%;
    height: 170px;
    border-radius: 6px;
  }
  .rank-info { width: 100%; }
  .rank-title { -webkit-line-clamp: 1; }

  /* 国庆活动卡片 */
  .promo-card {
    margin-top: 12px;
    padding: 16px 14px;
    border-radius: 10px;
  }
  .promo-title { font-size: 18px; }
  .promo-btn { padding: 6px 16px !important; font-size: 13px !important; }
}
</style>

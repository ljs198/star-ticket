<!--
  演出列表页（views/user/event/EventList.vue）
  知识点：
  1. 列表分页：reactive query {page,size,keyword,city,category}，响应 {records,total,page,size}
  2. EventFilter 组件 v-model 透传：keyword/city/category 双向绑定，@search 触发查询
  3. 防抖搜索：EventFilter 内部 300ms 防抖后 emit search；城市/分类变更用 watch 触发查询
  4. 骨架屏 el-skeleton：首屏加载占位，避免白屏
  5. 空状态 el-empty：无数据兜底
  6. 响应式栅格：CSS Grid 1/2/3/4 列自适应（移动 1 / 平板 2 / 桌面 3 / 大屏 4）
  7. BasePagination v-model:page/size 双向绑定，@change 拉取
-->
<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { eventApi } from '@/api'
import type { EventItem, EventListQuery, EventSort, PageResult } from '@/api/types'
import { EventCard, EventFilter, BasePagination, RetryError } from '@/components'

const route = useRoute()

/** 接口失败态（配合 RetryError 统一重试） */
const loadError = ref<unknown>(null)

/** 城市筛选选项（PRD v2.0 固定四个城市） */
const CITIES = ['北京', '上海', '广州', '深圳']
/** 分类筛选选项 */
const CATEGORIES = ['演唱会', '话剧', '体育赛事', '音乐会']

const loading = ref(false)
const list = ref<EventItem[]>([])
const total = ref(0)

/** 列表查询参数（响应式），从路由 query 初始化（支持首页搜索/分类跳转） */
const query = reactive<EventListQuery>({
  page: 1,
  size: 12,
  keyword: (route.query.keyword as string) || '',
  city: (route.query.city as string) || '',
  category: (route.query.category as string) || ''
})

/** 价格区间筛选（UI 输入单位为元，调用 API 时转换为分） */
const minPriceYuan = ref<number | undefined>(undefined)
const maxPriceYuan = ref<number | undefined>(undefined)
/** 排序方式 */
const sort = ref<EventSort | ''>('')

/** 拉取列表数据 */
async function fetchList() {
  loading.value = true
  loadError.value = null
  try {
    const res: PageResult<EventItem> = await eventApi.list({
      page: query.page,
      size: query.size,
      keyword: query.keyword || undefined,
      city: query.city || undefined,
      category: query.category || undefined,
      // 元 -> 分（×100），与后端价格单位一致
      minPrice: minPriceYuan.value != null ? minPriceYuan.value * 100 : undefined,
      maxPrice: maxPriceYuan.value != null ? maxPriceYuan.value * 100 : undefined,
      sort: sort.value || undefined
    })
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    loadError.value = e
  } finally {
    loading.value = false
  }
}

/** 关键词搜索（重置到第 1 页） */
function handleSearch() {
  query.page = 1
  fetchList()
}

/** 分页变更 */
function handlePageChange() {
  fetchList()
}

// 城市/分类变更即触发查询（重置到第 1 页）
watch(
  () => [query.city, query.category],
  () => handleSearch()
)
// 排序变更即触发查询
watch(
  () => sort.value,
  () => handleSearch()
)

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <EventFilter
        v-model:keyword="query.keyword"
        v-model:city="query.city"
        v-model:category="query.category"
        v-model:min-price="minPriceYuan"
        v-model:max-price="maxPriceYuan"
        v-model:sort="sort"
        :cities="CITIES"
        :categories="CATEGORIES"
        :show-price-sort="true"
        @search="handleSearch"
      />

      <el-skeleton v-if="loading" :rows="6" animated />

      <RetryError
        v-else-if="loadError"
        :loading="loading"
        @retry="fetchList"
      />

      <template v-else>
        <el-empty v-if="!list.length" description="暂无数据" />
        <div v-else class="event-grid">
          <EventCard v-for="item in list" :key="item.id" :event="item" />
        </div>

        <BasePagination
          v-if="total > 0"
          v-model:page="query.page"
          v-model:size="query.size"
          :total="total"
          @change="handlePageChange"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 8px 0 24px;
}
.event-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(1, 1fr);
}
@media (min-width: $bp-tablet) {
  .event-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 992px) {
  .event-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: $bp-desktop) {
  .event-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>

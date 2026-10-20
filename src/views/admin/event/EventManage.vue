<!--
  演出管理列表（views/admin/event/EventManage.vue）
  知识点：
  1. 管理端列表：adminEventApi.list 分页，EventFilter(showStatus=true) 筛选
  2. BaseTable 多选列（selectable），columns 驱动列
  3. 操作：编辑 -> /admin/events/:id/edit；场次 -> /admin/events/:id/sessions；删除需 confirm
  4. 顶部“新建演出”按钮 -> /admin/events/new
  5. 状态标签：DRAFT/ON_SALE/SOLD_OUT/END
-->
<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminEventApi } from '@/api'
import type { EventItem, EventListQuery, EventStatus, PageResult } from '@/api/types'
import { BaseTable, BasePagination, EventFilter } from '@/components'
import { formatDateTime } from '@/utils/format'

const router = useRouter()

const CITIES = ['北京', '上海', '广州', '深圳']
const CATEGORIES = ['演唱会', '话剧', '体育赛事', '音乐会']

const loading = ref(false)
const list = ref<EventItem[]>([])
const total = ref(0)
const selected = ref<EventItem[]>([])
const query = reactive<EventListQuery>({
  page: 1,
  size: 10,
  keyword: '',
  city: '',
  category: '',
  status: undefined
})

const columns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'title', label: '演出名称', minWidth: 160 },
  { prop: 'venue', label: '场馆', minWidth: 120 },
  { prop: 'city', label: '城市', width: 90 },
  { prop: 'category', label: '分类', width: 100 },
  { prop: 'status', label: '状态', slot: 'status', width: 90 },
  { prop: 'showTime', label: '演出时间', slot: 'showTime', width: 170 },
  { prop: 'actions', label: '操作', slot: 'actions', minWidth: 240, fixed: 'right' as const }
]

function statusText(s: EventStatus): string {
  return { DRAFT: '未上架', ON_SALE: '在售', SOLD_OUT: '售罄', END: '已结束' }[s] ?? s
}
function statusType(s: EventStatus): 'info' | 'success' | 'warning' {
  if (s === 'ON_SALE') return 'success'
  if (s === 'SOLD_OUT') return 'warning'
  return 'info'
}

async function fetchList() {
  loading.value = true
  try {
    const res: PageResult<EventItem> = await adminEventApi.list({
      page: query.page,
      size: query.size,
      keyword: query.keyword || undefined,
      city: query.city || undefined,
      category: query.category || undefined,
      status: query.status || undefined
    })
    list.value = res.records ?? []
    total.value = res.total ?? 0
    // 数据更新后清空已选，避免与 el-table 内部 selection 状态不同步
    selected.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}
function handlePageChange() {
  fetchList()
}
watch(() => [query.city, query.category, query.status], () => handleSearch())

function goNew() {
  router.push('/admin/events/new')
}
function goEdit(id: number) {
  router.push(`/admin/events/${id}/edit`)
}
function goSessions(id: number) {
  router.push(`/admin/events/${id}/sessions`)
}

async function handleDelete(row: EventItem) {
  try {
    await ElMessageBox.confirm(`确认删除演出「${row.title}」吗？`, '删除演出', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
    await adminEventApi.remove(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    /* 取消 */
  }
}

/** 是否可上架（未上架 -> 在售） */
function canPublish(s: EventStatus): boolean {
  return s === 'DRAFT'
}
/** 是否可下架（在售 -> 未上架） */
function canUnpublish(s: EventStatus): boolean {
  return s === 'ON_SALE'
}

/** 行内上下架切换（PRD：管理端行内状态切换） */
async function handleToggleStatus(row: EventItem) {
  const next: EventStatus = canPublish(row.status) ? 'ON_SALE' : 'DRAFT'
  const action = next === 'ON_SALE' ? '上架' : '下架'
  try {
    await ElMessageBox.confirm(`确认${action}演出「${row.title}」吗？`, `${action}演出`, {
      type: 'warning',
      confirmButtonText: `确认${action}`,
      cancelButtonText: '取消'
    })
    await adminEventApi.updateStatus(row.id, next)
    ElMessage.success(`已${action}`)
    fetchList()
  } catch {
    /* 取消 */
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <h2 class="page-title">演出管理</h2>
      <el-button type="primary" @click="goNew">新建演出</el-button>
    </div>

    <EventFilter
      v-model:keyword="query.keyword"
      v-model:city="query.city"
      v-model:category="query.category"
      :status="query.status ?? ''"
      :cities="CITIES"
      :categories="CATEGORIES"
      show-status
      @update:status="(v: EventStatus | '') => (query.status = v || undefined)"
      @search="handleSearch"
    />

    <BaseTable
      :data="list"
      :columns="columns"
      :loading="loading"
      :selectable="true"
      row-key="id"
      @selection-change="(val: EventItem[]) => (selected = val)"
    >
      <template #status="{ row }">
        <el-tag :type="statusType((row as EventItem).status)" size="small">
          {{ statusText((row as EventItem).status) }}
        </el-tag>
      </template>
      <template #showTime="{ row }">
        {{ (row as EventItem).showTime ? formatDateTime((row as EventItem).showTime!) : '-' }}
      </template>
      <template #actions="{ row }">
        <el-button link type="primary" @click="goEdit((row as EventItem).id)">编辑</el-button>
        <el-button link type="primary" @click="goSessions((row as EventItem).id)">场次</el-button>
        <el-button
          v-if="canPublish((row as EventItem).status)"
          link
          type="success"
          @click="handleToggleStatus(row as EventItem)"
        >
          上架
        </el-button>
        <el-button
          v-else-if="canUnpublish((row as EventItem).status)"
          link
          type="warning"
          @click="handleToggleStatus(row as EventItem)"
        >
          下架
        </el-button>
        <el-button link type="danger" @click="handleDelete(row as EventItem)">删除</el-button>
      </template>
    </BaseTable>

    <BasePagination
      v-if="total > 0"
      v-model:page="query.page"
      v-model:size="query.size"
      :total="total"
      @change="handlePageChange"
    />
  </div>
</template>

<style scoped lang="scss">
.admin-page {
  background: #fff;
  border-radius: var(--radius-card);
  padding: 16px 20px;
}
.admin-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}
</style>

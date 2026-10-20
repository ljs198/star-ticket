<!--
  我的预约（views/user/reservation/MyReservations.vue）
  知识点：
  1. reservationApi.list 分页拉取预约列表
  2. 卡片列表展示：演出/场次时间/票档/状态
  3. 状态标签：PENDING 待通知 / NOTIFIED 可购买 / CANCELED 已取消
  4. PENDING 状态可取消：ElMessageBox.confirm 后 reservationApi.cancel
  5. 分页：BasePagination
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
import { reservationApi } from '@/api'
import type { ReservationItem, PageResult, PageQuery } from '@/api/types'
import { BasePagination } from '@/components'
import { formatDateTime } from '@/utils/format'

type ReservationStatus = 'PENDING' | 'NOTIFIED' | 'CANCELED'

const loading = ref(false)
const list = ref<ReservationItem[]>([])
const total = ref(0)
const query = reactive<PageQuery>({ page: 1, size: 10 })

/** 预约状态 -> 标签元信息 */
function statusMeta(status: ReservationStatus): {
  label: string
  type: 'warning' | 'success' | 'info'
} {
  switch (status) {
    case 'PENDING':
      return { label: '待通知', type: 'warning' }
    case 'NOTIFIED':
      return { label: '可购买', type: 'success' }
    case 'CANCELED':
      return { label: '已取消', type: 'info' }
    default:
      return { label: '未知', type: 'info' }
  }
}

async function fetchList() {
  loading.value = true
  try {
    const res: PageResult<ReservationItem> = await reservationApi.list({
      page: query.page,
      size: query.size
    })
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

function handlePageChange() {
  fetchList()
}

async function handleCancel(row: ReservationItem) {
  try {
    await ElMessageBox.confirm('确认取消该预约吗？', '取消预约', {
      type: 'warning',
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想'
    })
    await reservationApi.cancel(row.id)
    ElMessage.success('预约已取消')
    fetchList()
  } catch {
    /* 用户取消确认 */
  }
}

const loadingRef = computed(() => loading.value)

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <el-skeleton v-if="loadingRef" :rows="5" animated />
      <template v-else>
        <el-empty v-if="!list.length" description="暂无预约" />
        <div v-else class="res-list">
          <div v-for="item in list" :key="item.id" class="res-card card">
            <div class="res-main">
              <div class="res-title">{{ item.eventTitle }}</div>
              <div class="res-meta">场次：{{ formatDateTime(item.showTime) }}</div>
              <div class="res-meta">票档：{{ item.categoryName }}</div>
              <div class="res-meta">预约时间：{{ formatDateTime(item.createTime) }}</div>
            </div>
            <div class="res-action">
              <el-tag :type="statusMeta(item.status as ReservationStatus).type" size="small">
                {{ statusMeta(item.status as ReservationStatus).label }}
              </el-tag>
              <el-button
                v-if="item.status === 'PENDING'"
                link
                type="danger"
                @click="handleCancel(item)"
              >
                取消预约
              </el-button>
              <el-button
                v-else-if="item.status === 'NOTIFIED'"
                type="primary"
                size="small"
                @click="$router.push(`/sessions/${item.sessionId}`)"
              >
                去购买
              </el-button>
            </div>
          </div>
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
.res-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.res-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}
.res-main {
  flex: 1;
  min-width: 0;
}
.res-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}
.res-meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 2px 0;
}
.res-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
/* ========== 移动端（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .page-body {
    padding: 8px 0 calc(24px + 56px);
  }
  .res-card {
    padding: 14px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .res-action {
    flex-direction: row;
    align-items: center;
    align-self: stretch;
    justify-content: space-between;
  }
}
</style>

<!--
  我的订单列表（views/user/order/OrderList.vue）
  知识点：
  1. 订单状态筛选：el-tabs 切换，Tab = 全部 + 各状态（PRD 7.1）
  2. BaseTable 列定义驱动：orderNo/演出/场次时间/金额/状态/下单时间/操作
  3. 状态列插槽 -> OrderStatusTag；操作列插槽 -> 查看详情 / 取消
  4. 取消订单：ElMessageBox.confirm 二次确认后 orderApi.cancel
  5. 分页：BasePagination v-model:page/size，@change 拉取
-->
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api'
import type { OrderListItem, OrderListQuery, PageResult } from '@/api/types'
import { BaseTable, BasePagination, OrderStatusTag, RetryError } from '@/components'
import { OrderStatus, getOrderStatusMeta, canCancel } from '@/utils/order-status'
import { formatDateTime, formatMoneyWithSymbol } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const loadError = ref<unknown>(null)
const list = ref<OrderListItem[]>([])
const total = ref(0)
const query = reactive<OrderListQuery>({ page: 1, size: 10, status: undefined })

/** 当前激活的 Tab：'' 表示全部 */
const activeTab = ref<string>('')

/** 状态 Tab 选项：全部 + 各状态 */
const tabs = [
  { value: '', label: '全部' },
  ...Object.values(OrderStatus).map((s) => ({
    value: s,
    label: getOrderStatusMeta(s).label
  }))
]

const columns = [
  { prop: 'orderNo', label: '订单号', minWidth: 180 },
  { prop: 'eventTitle', label: '演出', minWidth: 160 },
  { prop: 'showTime', label: '场次时间', slot: 'showTime', width: 170 },
  { prop: 'payAmount', label: '金额', slot: 'payAmount', width: 120 },
  { prop: 'status', label: '状态', slot: 'status', width: 100 },
  { prop: 'createTime', label: '下单时间', slot: 'createTime', width: 170 },
  { prop: 'actions', label: '操作', slot: 'actions', width: 160, fixed: 'right' as const }
]

async function fetchList() {
  loading.value = true
  loadError.value = null
  try {
    const res: PageResult<OrderListItem> = await orderApi.list({
      page: query.page,
      size: query.size,
      status: query.status
    })
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    loadError.value = e
  } finally {
    loading.value = false
  }
}

/** Tab 切换：更新筛选状态并重置到第 1 页 */
function handleTabChange(value: string) {
  activeTab.value = value
  query.status = (value || undefined) as OrderStatus | undefined
  query.page = 1
  fetchList()
}

function handlePageChange() {
  fetchList()
}

function goDetail(orderNo: string) {
  router.push(`/orders/${orderNo}`)
}

async function handleCancel(row: OrderListItem) {
  try {
    await ElMessageBox.confirm(`确认取消订单 ${row.orderNo} 吗？`, '取消订单', {
      type: 'warning',
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想'
    })
    await orderApi.cancel(row.orderNo)
    ElMessage.success('订单已取消')
    fetchList()
  } catch {
    /* 用户取消确认 */
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-body">
      <el-tabs
        :model-value="activeTab"
        class="order-tabs"
        @update:model-value="(v: string | number) => handleTabChange(String(v))"
      >
        <el-tab-pane
          v-for="t in tabs"
          :key="t.value"
          :label="t.label"
          :name="t.value"
        />
      </el-tabs>

      <RetryError
        v-if="loadError"
        :loading="loading"
        @retry="fetchList"
      />

      <el-empty v-else-if="!loading && !list.length" description="暂无订单" />

      <!-- 桌面端表格 + 移动端卡片（同一 v-else 分支，CSS 控制显示） -->
      <template v-else>
        <BaseTable
          class="order-table"
          :data="list"
          :columns="columns"
          :loading="loading"
          row-key="orderNo"
        >
          <template #showTime="{ row }">
            {{ formatDateTime((row as OrderListItem).showTime) }}
          </template>
          <template #payAmount="{ row }">
            {{ formatMoneyWithSymbol((row as OrderListItem).payAmount) }}
          </template>
          <template #status="{ row }">
            <OrderStatusTag :status="(row as OrderListItem).status" />
          </template>
          <template #createTime="{ row }">
            {{ formatDateTime((row as OrderListItem).createTime) }}
          </template>
          <template #actions="{ row }">
            <el-button link type="primary" @click="goDetail((row as OrderListItem).orderNo)">
              查看详情
            </el-button>
            <el-button
              v-if="canCancel((row as OrderListItem).status)"
              link
              type="danger"
              @click="handleCancel(row as OrderListItem)"
            >
              取消
            </el-button>
          </template>
        </BaseTable>

        <div class="order-cards">
          <div
            v-for="row in list"
            :key="row.orderNo"
            class="order-card card"
            @click="goDetail(row.orderNo)"
          >
            <div class="oc-header">
              <span class="oc-title">{{ row.eventTitle }}</span>
              <OrderStatusTag :status="row.status" />
            </div>
            <div class="oc-row">
              <span class="oc-label">场次</span>
              <span class="oc-value">{{ formatDateTime(row.showTime) }}</span>
            </div>
            <div class="oc-row">
              <span class="oc-label">下单</span>
              <span class="oc-value">{{ formatDateTime(row.createTime) }}</span>
            </div>
            <div class="oc-footer">
              <span class="oc-amount">{{ formatMoneyWithSymbol(row.payAmount) }}</span>
              <div class="oc-actions" @click.stop>
                <el-button
                  v-if="canCancel(row.status)"
                  link
                  type="danger"
                  size="small"
                  @click="handleCancel(row)"
                >
                  取消
                </el-button>
                <el-button link type="primary" size="small" @click="goDetail(row.orderNo)">
                  详情
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <BasePagination
        v-if="total > 0"
        v-model:page="query.page"
        v-model:size="query.size"
        :total="total"
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 8px 0 24px;
}
.order-tabs {
  margin-bottom: 16px;
}

/* 移动端卡片列表：默认隐藏，移动端显示 */
.order-cards {
  display: none;
  flex-direction: column;
  gap: 12px;
}
.order-card {
  padding: 14px;
  cursor: pointer;
}
.oc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}
.oc-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oc-row {
  display: flex;
  font-size: 13px;
  margin-bottom: 4px;
}
.oc-label {
  width: 48px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}
.oc-value {
  flex: 1;
  color: var(--color-text-secondary);
}
.oc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}
.oc-amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-danger);
}
.oc-actions {
  display: flex;
  gap: 4px;
}

/* ========== 移动端（≤768px）：表格隐藏，卡片显示 ========== */
@media (max-width: $bp-tablet) {
  .order-table { display: none; }
  .order-cards { display: flex; }
  .order-tabs {
    margin-bottom: 12px;
    :deep(.el-tabs__nav-wrap) {
      overflow-x: auto;
    }
    :deep(.el-tabs__item) {
      font-size: 13px;
      padding: 0 12px;
    }
  }
}
</style>

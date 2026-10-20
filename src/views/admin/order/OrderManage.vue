<!--
  订单管理（views/admin/order/OrderManage.vue）
  知识点：
  1. 管理端订单列表：adminOrderApi.list 分页 + 状态筛选
  2. BaseTable 列：订单号/演出/用户/金额/状态/下单时间/操作
  3. 查看详情：弹窗展示 adminOrderApi.detail 全量信息
  4. 强制取消：弹窗输入原因 -> adminOrderApi.forceCancel(orderNo, reason)
  5. 退款审批：通过/驳回 -> adminOrderApi.approveRefund(orderNo, true/false)
  6. 状态标签复用 OrderStatusTag；操作按钮按状态机显隐
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminOrderApi } from '@/api'
import type { OrderListItem, OrderListQuery, OrderDetail, PageResult } from '@/api/types'
import { BaseTable, BasePagination, OrderStatusTag } from '@/components'
import {
  OrderStatus,
  getOrderStatusMeta,
  isTerminalStatus
} from '@/utils/order-status'
import { formatDateTime, formatMoneyWithSymbol } from '@/utils/format'

const loading = ref(false)
const list = ref<OrderListItem[]>([])
const total = ref(0)
const query = reactive<OrderListQuery>({
  page: 1,
  size: 10,
  status: undefined,
  orderNo: undefined,
  username: undefined,
  startTime: undefined,
  endTime: undefined
})

/** 下单时间区间（el-date-picker 绑定 [start, end]） */
const dateRange = ref<[string, string] | null>(null)

const statusOptions = Object.values(OrderStatus).map((s) => ({
  value: s,
  label: getOrderStatusMeta(s).label
}))

const columns = [
  { prop: 'orderNo', label: '订单号', minWidth: 180 },
  { prop: 'eventTitle', label: '演出', minWidth: 140 },
  { prop: 'username', label: '用户', slot: 'user', width: 120 },
  { prop: 'payAmount', label: '金额', slot: 'payAmount', width: 120 },
  { prop: 'status', label: '状态', slot: 'status', width: 100 },
  { prop: 'createTime', label: '下单时间', slot: 'createTime', width: 170 },
  { prop: 'actions', label: '操作', slot: 'actions', minWidth: 240, fixed: 'right' as const }
]

/** 用户展示 */
function userCell(row: OrderListItem): string {
  return row.username ?? '-'
}

/** 可强制取消：非终态订单 */
function canForceCancel(status: OrderStatus): boolean {
  return !isTerminalStatus(status)
}
/** 可退款审批：退款中状态 */
function canApproveRefund(status: OrderStatus): boolean {
  return status === OrderStatus.REFUNDING
}

async function fetchList() {
  loading.value = true
  try {
    // 时间区间从 dateRange 映射到 startTime/endTime
    if (dateRange.value && dateRange.value.length === 2) {
      query.startTime = dateRange.value[0]
      query.endTime = dateRange.value[1]
    } else {
      query.startTime = undefined
      query.endTime = undefined
    }
    const res: PageResult<OrderListItem> = await adminOrderApi.list({
      page: query.page,
      size: query.size,
      status: query.status,
      orderNo: query.orderNo || undefined,
      username: query.username || undefined,
      startTime: query.startTime,
      endTime: query.endTime
    })
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}
function handleReset() {
  query.orderNo = undefined
  query.username = undefined
  query.status = undefined
  dateRange.value = null
  handleSearch()
}
function handlePageChange() {
  fetchList()
}

/* ============== 详情弹窗 ============== */
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<OrderDetail | null>(null)

async function openDetail(row: OrderListItem) {
  detailVisible.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await adminOrderApi.detail(row.orderNo)
  } finally {
    detailLoading.value = false
  }
}

/* ============== 强制取消弹窗（PRD 3.4：输订单号后4位校验） ============== */
const cancelVisible = ref(false)
const cancelSaving = ref(false)
const cancelTarget = ref<OrderListItem | null>(null)
const cancelReason = ref('')
/** 管理员需输入订单号后4位以确认 */
const cancelConfirmCode = ref('')
/** 校验输入是否等于目标订单号后4位 */
const cancelCodeValid = computed(() => {
  if (!cancelTarget.value) return false
  const tail = cancelTarget.value.orderNo.slice(-4)
  return cancelConfirmCode.value.trim() === tail
})

function openForceCancel(row: OrderListItem) {
  cancelTarget.value = row
  cancelReason.value = ''
  cancelConfirmCode.value = ''
  cancelVisible.value = true
}

async function handleForceCancel() {
  if (!cancelTarget.value) return
  if (!cancelCodeValid.value) {
    ElMessage.error('订单号后4位校验未通过')
    return
  }
  if (!cancelReason.value.trim()) {
    ElMessage.error('请输入取消原因')
    return
  }
  cancelSaving.value = true
  try {
    await adminOrderApi.forceCancel(cancelTarget.value.orderNo, cancelReason.value.trim())
    ElMessage.success('已强制取消')
    cancelVisible.value = false
    fetchList()
  } finally {
    cancelSaving.value = false
  }
}

/* ============== 退款审批 ============== */
async function handleApproveRefund(row: OrderListItem, approved: boolean) {
  const action = approved ? '通过' : '驳回'
  try {
    await ElMessageBox.confirm(`确认${action}订单 ${row.orderNo} 的退款申请？`, '退款审批', {
      type: approved ? 'success' : 'warning',
      confirmButtonText: `确认${action}`,
      cancelButtonText: '取消'
    })
    await adminOrderApi.approveRefund(row.orderNo, approved)
    ElMessage.success(`已${action}退款`)
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
      <h2 class="page-title">订单管理</h2>
    </div>

    <!-- 多条件查询区 -->
    <div class="filter-bar">
      <el-input
        v-model="query.orderNo"
        placeholder="订单号"
        clearable
        class="filter-item"
        @keyup.enter="handleSearch"
      />
      <el-input
        v-model="query.username"
        placeholder="用户名"
        clearable
        class="filter-item"
        @keyup.enter="handleSearch"
      />
      <el-select
        v-model="query.status"
        placeholder="全部状态"
        clearable
        class="filter-item"
        @change="handleSearch"
      >
        <el-option
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        value-format="YYYY-MM-DD HH:mm:ss"
        class="filter-item date-range"
        @change="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-empty v-if="!loading && !list.length" description="暂无订单" />

    <BaseTable v-else :data="list" :columns="columns" :loading="loading" row-key="orderNo">
      <template #user="{ row }">
        {{ userCell(row as OrderListItem) }}
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
        <el-button link type="primary" @click="openDetail(row as OrderListItem)">详情</el-button>
        <el-button
          v-if="canForceCancel((row as OrderListItem).status)"
          link
          type="danger"
          @click="openForceCancel(row as OrderListItem)"
        >
          强制取消
        </el-button>
        <template v-if="canApproveRefund((row as OrderListItem).status)">
          <el-button link type="success" @click="handleApproveRefund(row as OrderListItem, true)">
            通过退款
          </el-button>
          <el-button link type="warning" @click="handleApproveRefund(row as OrderListItem, false)">
            驳回退款
          </el-button>
        </template>
      </template>
    </BaseTable>

    <BasePagination
      v-if="total > 0"
      v-model:page="query.page"
      v-model:size="query.size"
      :total="total"
      @change="handlePageChange"
    />

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="640px">
      <el-skeleton v-if="detailLoading" :rows="6" animated />
      <div v-else-if="detail" class="detail-box">
        <div class="detail-row"><span>订单号</span><span>{{ detail.orderNo }}</span></div>
        <div class="detail-row"><span>演出</span><span>{{ detail.eventTitle }}</span></div>
        <div class="detail-row"><span>场次</span><span>{{ formatDateTime(detail.showTime) }}</span></div>
        <div class="detail-row"><span>场馆</span><span>{{ detail.venue }}</span></div>
        <div class="detail-row">
          <span>状态</span>
          <OrderStatusTag :status="detail.status" />
        </div>
        <div class="detail-row"><span>金额</span><span>{{ formatMoneyWithSymbol(detail.payAmount) }}</span></div>
        <div class="detail-row"><span>下单时间</span><span>{{ formatDateTime(detail.createTime) }}</span></div>
        <div v-if="detail.payTime" class="detail-row"><span>支付时间</span><span>{{ formatDateTime(detail.payTime) }}</span></div>
        <div v-if="detail.payNo" class="detail-row"><span>支付流水</span><span>{{ detail.payNo }}</span></div>
        <div class="detail-block">
          <div class="detail-subtitle">票档明细</div>
          <div v-for="(item, i) in detail.items" :key="i" class="detail-item">
            {{ item.categoryName }} × {{ item.quantity }}
            <span v-if="item.seatLabels && item.seatLabels.length">
              （{{ item.seatLabels.join('、') }}）
            </span>
          </div>
        </div>
        <div v-if="detail.attendees && detail.attendees.length" class="detail-block">
          <div class="detail-subtitle">观演人</div>
          <div v-for="(a, i) in detail.attendees" :key="i" class="detail-item">
            {{ a.name }} / {{ a.phone }}
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 强制取消弹窗（PRD 3.4：需输入订单号后4位校验） -->
    <el-dialog v-model="cancelVisible" title="强制取消订单" width="480px">
      <div v-if="cancelTarget" class="cancel-tip">
        确认强制取消订单 <strong>{{ cancelTarget.orderNo }}</strong> 吗？
        为防止误操作，请输入订单号后4位 <code>{{ cancelTarget.orderNo.slice(-4) }}</code> 进行确认。
      </div>
      <el-input
        v-model="cancelConfirmCode"
        placeholder="请输入订单号后4位"
        maxlength="4"
        class="cancel-confirm-input"
      />
      <el-input
        v-model="cancelReason"
        type="textarea"
        :rows="3"
        placeholder="请输入取消原因"
        maxlength="200"
        show-word-limit
        class="cancel-reason-input"
      />
      <template #footer>
        <el-button @click="cancelVisible = false">取消</el-button>
        <el-button
          type="danger"
          :loading="cancelSaving"
          :disabled="!cancelCodeValid || !cancelReason.trim()"
          @click="handleForceCancel"
        >
          确认取消
        </el-button>
      </template>
    </el-dialog>
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
.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}
.filter-item {
  width: 160px;
}
.date-range {
  width: 360px;
}
.status-select {
  width: 180px;
}
.detail-box {
  font-size: 14px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  span:first-child {
    color: var(--color-text-secondary);
  }
}
.detail-block {
  margin-top: 16px;
}
.detail-subtitle {
  font-weight: 600;
  margin-bottom: 8px;
}
.detail-item {
  padding: 4px 0;
  color: var(--color-text-secondary);
}
.cancel-tip {
  font-size: 14px;
  color: var(--color-text);
  margin-bottom: 12px;
  strong {
    color: var(--color-danger);
  }
  code {
    margin: 0 2px;
    padding: 1px 6px;
    background: var(--color-bg-muted, #f5f5f5);
    border-radius: 4px;
    font-weight: 700;
    color: var(--color-danger);
    font-family: monospace;
  }
}
.cancel-confirm-input {
  margin-bottom: 12px;
}
.cancel-reason-input {
  margin-bottom: 4px;
}
@media (max-width: $bp-mobile) {
  .filter-item,
  .date-range,
  .status-select {
    width: 100%;
  }
}
</style>

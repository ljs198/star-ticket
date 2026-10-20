<!--
  座位管理（views/admin/seat/SeatManage.vue）
  知识点：
  1. 嵌套资源：/admin/sessions/:id/seats，route.params.id = sessionId
  2. adminSeatApi.list(sessionId) 返回扁平 Seat[]，按 area 分组后交给 SeatMap 可视化
  3. SeatMap 复用为只读可视化（selectedIds=[]），点击座位打开单个编辑弹窗
  4. 批量生成弹窗：area + rows(逗号分隔) + cols + categoryId + status
     -> adminSeatApi.batchCreate(sessionId, BatchCreateSeatPayload)
  5. 单个编辑：adminSeatApi.update(id, { status })
  6. sessionApi.categories 提供 categoryId 下拉
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { adminSeatApi, sessionApi } from '@/api'
import type { BatchCreateSeatPayload } from '@/api/modules/admin/seat'
import type { Seat, SeatArea, TicketCategory } from '@/api/types'
import { SeatMap, BaseDialog, BaseTable, BasePagination } from '@/components'
import { SeatStatus, getSeatStyle } from '@/utils/seat-status'
import { formatMoneyWithSymbol } from '@/utils/format'

/** 座位状态 -> el-tag 类型映射（列表视图） */
const SEAT_TAG_TYPE: Record<SeatStatus, 'success' | 'warning' | 'info' | 'danger'> = {
  [SeatStatus.AVAILABLE]: 'success',
  [SeatStatus.LOCKED]: 'warning',
  [SeatStatus.SOLD]: 'info',
  [SeatStatus.DISABLED]: 'danger'
}

const route = useRoute()
const sessionId = computed(() => Number(route.params.id))

const loading = ref(false)
const seats = ref<Seat[]>([])
const categories = ref<TicketCategory[]>([])

/** 视图模式：座位图 / 列表（PRD：管理端座位列表分页） */
const viewMode = ref<'map' | 'table'>('map')

/** 分页参数（列表视图） */
const seatPage = reactive({ page: 1, size: 20 })

/** 列表视图当前页数据（客户端分页） */
const pagedSeats = computed(() => {
  const start = (seatPage.page - 1) * seatPage.size
  return seats.value.slice(start, start + seatPage.size)
})

const STATUS_OPTIONS = [
  { label: '可售', value: SeatStatus.AVAILABLE },
  { label: '锁定', value: SeatStatus.LOCKED },
  { label: '已售', value: SeatStatus.SOLD },
  { label: '禁用', value: SeatStatus.DISABLED }
]

/** 列表视图列定义 */
const seatColumns = [
  { prop: 'id', label: '座位ID', width: 100 },
  { prop: 'area', label: '区域', width: 140 },
  { prop: 'row', label: '行', width: 80 },
  { prop: 'col', label: '列', width: 80 },
  { prop: 'price', label: '价格', slot: 'price', width: 120 },
  { prop: 'status', label: '状态', slot: 'status', width: 100 },
  { prop: 'actions', label: '操作', slot: 'actions', width: 120, fixed: 'right' as const }
]

/** 扁平座位按 area 分组为 SeatArea[] */
const groupedAreas = computed<SeatArea[]>(() => {
  const map = new Map<string, Seat[]>()
  for (const s of seats.value) {
    const arr = map.get(s.area) ?? []
    arr.push(s)
    map.set(s.area, arr)
  }
  return Array.from(map.entries()).map(([area, ss]) => ({
    area,
    seats: ss,
    rows: Array.from(new Set(ss.map((s) => s.row))).sort()
  }))
})

/* ============== 批量生成弹窗 ============== */
const batchVisible = ref(false)
const batchSaving = ref(false)
const batchRef = ref<FormInstance>()
const batchForm = reactive({
  area: '',
  rowsStr: '',
  cols: 10,
  categoryId: undefined as number | undefined,
  status: SeatStatus.AVAILABLE
})
const batchRules: FormRules = {
  area: [{ required: true, message: '请输入区域名', trigger: 'blur' }],
  rowsStr: [{ required: true, message: '请输入行号（逗号分隔）', trigger: 'blur' }],
  cols: [{ required: true, message: '请输入列数', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择票档', trigger: 'change' }]
}

/** 选择票档后自动填充区域名（避免区域名与票档名不一致） */
watch(
  () => batchForm.categoryId,
  (cid) => {
    if (cid != null) {
      const cat = categories.value.find((c) => c.id === cid)
      if (cat && !batchForm.area) batchForm.area = cat.name
    }
  }
)

function openBatch() {
  Object.assign(batchForm, {
    area: '',
    rowsStr: '',
    cols: 10,
    categoryId: categories.value[0]?.id,
    status: SeatStatus.AVAILABLE
  })
  batchVisible.value = true
}

async function handleBatchConfirm() {
  if (!batchRef.value) return
  await batchRef.value.validate(async (valid) => {
    if (!valid) return
    batchSaving.value = true
    try {
      const rows = batchForm.rowsStr
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
      const payload: BatchCreateSeatPayload = {
        area: batchForm.area,
        rows,
        cols: batchForm.cols,
        categoryId: batchForm.categoryId,
        status: batchForm.status
      }
      await adminSeatApi.batchCreate(sessionId.value, payload)
      ElMessage.success('批量生成成功')
      batchVisible.value = false
      fetchSeats()
    } finally {
      batchSaving.value = false
    }
  })
}

/* ============== 单个座位编辑弹窗 ============== */
const editVisible = ref(false)
const editSaving = ref(false)
const editingSeat = ref<Seat | null>(null)
const editForm = reactive({ status: SeatStatus.AVAILABLE })

function openEditSeat(seat: Seat) {
  editingSeat.value = seat
  editForm.status = seat.status
  editVisible.value = true
}

async function handleEditConfirm() {
  if (!editingSeat.value) return
  editSaving.value = true
  try {
    await adminSeatApi.update(editingSeat.value.id, { status: editForm.status })
    ElMessage.success('已更新座位状态')
    editVisible.value = false
    fetchSeats()
  } finally {
    editSaving.value = false
  }
}

async function fetchSeats() {
  loading.value = true
  try {
    seats.value = await adminSeatApi.list(sessionId.value)
    seatPage.page = 1
  } finally {
    loading.value = false
  }
}

/** 列表视图分页变更 */
function handleSeatPageChange() {
  // 客户端分页，无需重新请求
}

async function fetchCategories() {
  try {
    categories.value = await sessionApi.categories(sessionId.value)
  } catch {
    /* 忽略 */
  }
}

onMounted(() => {
  fetchSeats()
  fetchCategories()
})
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <h2 class="page-title">座位管理</h2>
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="map">座位图</el-radio-button>
          <el-radio-button value="table">列表</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="openBatch">批量生成座位</el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <!-- 座位图视图（可视化，全部座位） -->
      <div v-if="viewMode === 'map'" class="seat-map-wrap">
        <SeatMap
          :areas="groupedAreas"
          :selected-ids="[]"
          :disabled="false"
          @select="openEditSeat"
        />
        <p v-if="!seats.length" class="empty-tip">暂无座位，请点击“批量生成座位”</p>
        <p v-else class="tip">共 {{ seats.length }} 个座位，点击座位可修改状态</p>
      </div>

      <!-- 列表视图（分页，PRD：管理端座位列表分页） -->
      <div v-else class="seat-table-wrap">
        <BaseTable :data="pagedSeats" :columns="seatColumns" :loading="loading" row-key="id">
          <template #price="{ row }">
            {{ formatMoneyWithSymbol((row as Seat).price ?? 0) }}
          </template>
          <template #status="{ row }">
            <el-tag size="small" :type="SEAT_TAG_TYPE[(row as Seat).status]">
              {{ getSeatStyle((row as Seat).status).label }}
            </el-tag>
          </template>
          <template #actions="{ row }">
            <el-button link type="primary" @click="openEditSeat(row as Seat)">
              修改状态
            </el-button>
          </template>
        </BaseTable>
        <BasePagination
          v-if="seats.length > 0"
          v-model:page="seatPage.page"
          v-model:size="seatPage.size"
          :total="seats.length"
          @change="handleSeatPageChange"
        />
        <el-empty v-else description="暂无座位" />
      </div>
    </template>

    <!-- 批量生成弹窗 -->
    <BaseDialog
      v-model="batchVisible"
      title="批量生成座位"
      :confirm-loading="batchSaving"
      @confirm="handleBatchConfirm"
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="座位必须归属某个票档"
        description="选择票档后会自动填充区域名和价格，区域名通常与票档名称一致。"
        style="margin-bottom: 16px"
      />
      <el-form ref="batchRef" :model="batchForm" :rules="batchRules" label-width="100px">
        <el-form-item label="票档" prop="categoryId">
          <el-select v-model="batchForm.categoryId" placeholder="请选择票档（必选）">
            <el-option
              v-for="c in categories"
              :key="c.id"
              :label="`${c.name}（¥${(c.price / 100).toFixed(2)}）`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="区域名" prop="area">
          <el-input v-model="batchForm.area" placeholder="选择票档后自动填充，也可手动修改" />
        </el-form-item>
        <el-form-item label="行号" prop="rowsStr">
          <el-input v-model="batchForm.rowsStr" placeholder="逗号分隔，如 A,B,C" />
        </el-form-item>
        <el-form-item label="列数" prop="cols">
          <el-input-number v-model="batchForm.cols" :min="1" :max="50" controls-position="right" />
        </el-form-item>
        <el-form-item label="初始状态" prop="status">
          <el-select v-model="batchForm.status">
            <el-option
              v-for="opt in STATUS_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </BaseDialog>

    <!-- 单个座位编辑弹窗 -->
    <BaseDialog
      v-model="editVisible"
      title="修改座位状态"
      :confirm-loading="editSaving"
      @confirm="handleEditConfirm"
    >
      <div v-if="editingSeat" class="edit-seat-info">
        <span>区域：{{ editingSeat.area }}</span>
        <span>座位：{{ editingSeat.row }}{{ editingSeat.col }}</span>
      </div>
      <el-form label-width="100px" class="edit-seat-form">
        <el-form-item label="状态">
          <el-select v-model="editForm.status">
            <el-option
              v-for="opt in STATUS_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </BaseDialog>
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
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}
.seat-map-wrap {
  margin-top: 8px;
}
.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-placeholder);
}
.tip {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 12px;
}
.edit-seat-info {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-bg-muted);
  border-radius: var(--radius);
  font-size: 14px;
}
</style>

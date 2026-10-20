<!--
  场次管理（views/admin/session/SessionManage.vue）
  知识点：
  1. 嵌套资源：/admin/events/:id/sessions，route.params.id = eventId
  2. adminSessionApi.list(eventId) 拉场次列表（数组，非分页）
  3. 顶部展示演出标题（adminEventApi.detail 回填）
  4. 新建/编辑复用同一 BaseDialog + el-form
  5. 操作：票档 -> /admin/sessions/:id/categories；座位 -> /admin/sessions/:id/seats
  6. 日期 formatDateTime；状态 NOT_STARTED/ON_SALE/SOLD_OUT/ENDED
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { adminSessionApi, adminEventApi } from '@/api'
import type { SessionItem, SessionStatus } from '@/api/types'
import { BaseTable, BaseDialog } from '@/components'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const eventId = computed(() => Number(route.params.id))
const loading = ref(false)
const list = ref<SessionItem[]>([])
const eventTitle = ref('')

const STATUS_OPTIONS: { label: string; value: SessionStatus }[] = [
  { label: '未开售', value: 'NOT_STARTED' },
  { label: '在售', value: 'ON_SALE' },
  { label: '售罄', value: 'SOLD_OUT' },
  { label: '已结束', value: 'ENDED' }
]

const columns = [
  { prop: 'showTime', label: '演出时间', slot: 'showTime', width: 170 },
  { prop: 'venue', label: '场馆', minWidth: 140 },
  { prop: 'status', label: '状态', slot: 'status', width: 100 },
  { prop: 'saleStartTime', label: '开售时间', slot: 'saleStartTime', width: 170 },
  { prop: 'saleEndTime', label: '停售时间', slot: 'saleEndTime', width: 170 },
  { prop: 'actions', label: '操作', slot: 'actions', minWidth: 280, fixed: 'right' as const }
]

function statusText(s: SessionStatus): string {
  return { NOT_STARTED: '未开售', ON_SALE: '在售', SOLD_OUT: '售罄', ENDED: '已结束' }[s] ?? s
}
function statusType(s: SessionStatus): 'info' | 'success' | 'warning' {
  if (s === 'ON_SALE') return 'success'
  if (s === 'SOLD_OUT' || s === 'NOT_STARTED') return 'warning'
  return 'info'
}

/* ============== 对话框表单 ============== */
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  showTime: '',
  venue: '',
  status: 'NOT_STARTED' as SessionStatus,
  saleStartTime: '',
  saleEndTime: ''
})
const rules: FormRules = {
  showTime: [{ required: true, message: '请选择演出时间', trigger: 'change' }],
  venue: [{ required: true, message: '请输入场馆', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    showTime: '',
    venue: '',
    status: 'NOT_STARTED',
    saleStartTime: '',
    saleEndTime: ''
  })
  dialogVisible.value = true
}

function openEdit(row: SessionItem) {
  editingId.value = row.id
  Object.assign(form, {
    showTime: row.showTime ?? '',
    venue: row.venue ?? '',
    status: row.status ?? 'NOT_STARTED',
    saleStartTime: row.saleStartTime ?? '',
    saleEndTime: row.saleEndTime ?? ''
  })
  dialogVisible.value = true
}

async function handleConfirm() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const data: Partial<SessionItem> = {
        showTime: form.showTime || undefined,
        venue: form.venue,
        status: form.status,
        saleStartTime: form.saleStartTime || undefined,
        saleEndTime: form.saleEndTime || undefined
      }
      if (editingId.value != null) {
        await adminSessionApi.update(editingId.value, data)
        ElMessage.success('更新成功')
      } else {
        await adminSessionApi.create(eventId.value, data)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchList()
    } finally {
      saving.value = false
    }
  })
}

async function handleDelete(row: SessionItem) {
  try {
    await ElMessageBox.confirm('确认删除该场次吗？', '删除场次', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
    await adminSessionApi.remove(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    /* 取消 */
  }
}

function goCategories(id: number) {
  router.push(`/admin/sessions/${id}/categories`)
}
function goSeats(id: number) {
  router.push(`/admin/sessions/${id}/seats`)
}

async function fetchList() {
  loading.value = true
  try {
    list.value = await adminSessionApi.list(eventId.value)
  } finally {
    loading.value = false
  }
}

async function fetchEvent() {
  try {
    const e = await adminEventApi.detail(eventId.value)
    eventTitle.value = e.title
  } catch {
    eventTitle.value = `演出 #${eventId.value}`
  }
}

onMounted(() => {
  fetchEvent()
  fetchList()
})
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <div class="title-wrap">
        <h2 class="page-title">场次管理</h2>
        <span v-if="eventTitle" class="sub-title">{{ eventTitle }}</span>
      </div>
      <el-button type="primary" @click="openCreate">新建场次</el-button>
    </div>

    <BaseTable :data="list" :columns="columns" :loading="loading" row-key="id">
      <template #showTime="{ row }">
        {{ formatDateTime((row as SessionItem).showTime) }}
      </template>
      <template #status="{ row }">
        <el-tag :type="statusType((row as SessionItem).status)" size="small">
          {{ statusText((row as SessionItem).status) }}
        </el-tag>
      </template>
      <template #saleStartTime="{ row }">
        {{ (row as SessionItem).saleStartTime ? formatDateTime((row as SessionItem).saleStartTime) : '-' }}
      </template>
      <template #saleEndTime="{ row }">
        {{ (row as SessionItem).saleEndTime ? formatDateTime((row as SessionItem).saleEndTime) : '-' }}
      </template>
      <template #actions="{ row }">
        <el-button link type="primary" @click="goCategories((row as SessionItem).id)">票档</el-button>
        <el-button link type="primary" @click="goSeats((row as SessionItem).id)">座位</el-button>
        <el-button link type="primary" @click="openEdit(row as SessionItem)">编辑</el-button>
        <el-button link type="danger" @click="handleDelete(row as SessionItem)">删除</el-button>
      </template>
    </BaseTable>

    <BaseDialog
      v-model="dialogVisible"
      :title="editingId != null ? '编辑场次' : '新建场次'"
      :confirm-loading="saving"
      @confirm="handleConfirm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="演出时间" prop="showTime">
          <el-date-picker
            v-model="form.showTime"
            type="datetime"
            placeholder="选择演出时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="场馆" prop="venue">
          <el-input v-model="form.venue" placeholder="请输入场馆" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option
              v-for="opt in STATUS_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开售时间" prop="saleStartTime">
          <el-date-picker
            v-model="form.saleStartTime"
            type="datetime"
            placeholder="选择开售时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="停售时间" prop="saleEndTime">
          <el-date-picker
            v-model="form.saleEndTime"
            type="datetime"
            placeholder="选择停售时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
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
.title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}
.sub-title {
  font-size: 14px;
  color: var(--color-text-secondary);
}
</style>

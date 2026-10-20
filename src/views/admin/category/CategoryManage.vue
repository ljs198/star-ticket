<!--
  票档管理（views/admin/category/CategoryManage.vue）
  知识点：
  1. 嵌套资源：/admin/sessions/:id/categories，route.params.id = sessionId
  2. adminCategoryApi.list(sessionId) 拉票档列表（数组）
  3. 价格输入单位元，提交单位分：Math.round(yuan * 100)；回显 /100
  4. 新建/编辑复用同一 BaseDialog + el-form
  5. 表格列：名称/价格/颜色/总量/已售/剩余/限购/操作
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { adminCategoryApi } from '@/api'
import type { TicketCategory } from '@/api/types'
import { BaseTable, BaseDialog } from '@/components'
import { formatMoneyWithSymbol } from '@/utils/format'

const route = useRoute()
const sessionId = computed(() => Number(route.params.id))

const loading = ref(false)
const list = ref<TicketCategory[]>([])

const columns = [
  { prop: 'name', label: '名称', minWidth: 120 },
  { prop: 'price', label: '价格', slot: 'price', width: 120 },
  { prop: 'color', label: '颜色', slot: 'color', width: 80 },
  { prop: 'totalQuantity', label: '总量', width: 80 },
  { prop: 'soldQuantity', label: '已售', width: 80 },
  { prop: 'remainingQuantity', label: '剩余', width: 80 },
  { prop: 'limitPerUser', label: '限购', width: 80 },
  { prop: 'actions', label: '操作', slot: 'actions', width: 140, fixed: 'right' as const }
]

/* ============== 对话框表单 ============== */
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  priceYuan: undefined as number | undefined,
  color: '#4B3FE3',
  totalQuantity: undefined as number | undefined,
  limitPerUser: 4,
  description: ''
})
const rules: FormRules = {
  name: [{ required: true, message: '请输入票档名称', trigger: 'blur' }],
  priceYuan: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  totalQuantity: [{ required: true, message: '请输入总量', trigger: 'blur' }],
  limitPerUser: [{ required: true, message: '请输入限购数', trigger: 'blur' }]
}

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    priceYuan: undefined,
    color: '#4B3FE3',
    totalQuantity: undefined,
    limitPerUser: 4,
    description: ''
  })
  dialogVisible.value = true
}

function openEdit(row: TicketCategory) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    priceYuan: row.price / 100,
    color: row.color ?? '#4B3FE3',
    totalQuantity: row.totalQuantity,
    limitPerUser: row.limitPerUser,
    description: row.description ?? ''
  })
  dialogVisible.value = true
}

async function handleConfirm() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const data: Partial<TicketCategory> = {
        name: form.name,
        price: form.priceYuan != null ? Math.round(form.priceYuan * 100) : undefined,
        color: form.color,
        totalQuantity: form.totalQuantity,
        limitPerUser: form.limitPerUser,
        description: form.description || undefined
      }
      if (editingId.value != null) {
        await adminCategoryApi.update(editingId.value, data)
        ElMessage.success('更新成功')
      } else {
        await adminCategoryApi.create(sessionId.value, data)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchList()
    } finally {
      saving.value = false
    }
  })
}

async function handleDelete(row: TicketCategory) {
  try {
    await ElMessageBox.confirm(`确认删除票档「${row.name}」吗？`, '删除票档', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
    await adminCategoryApi.remove(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    /* 取消 */
  }
}

async function fetchList() {
  loading.value = true
  try {
    list.value = await adminCategoryApi.list(sessionId.value)
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <h2 class="page-title">票档管理</h2>
      <el-button type="primary" @click="openCreate">新建票档</el-button>
    </div>

    <BaseTable :data="list" :columns="columns" :loading="loading" row-key="id">
      <template #price="{ row }">
        {{ formatMoneyWithSymbol((row as TicketCategory).price) }}
      </template>
      <template #color="{ row }">
        <span class="color-box" :style="{ background: (row as TicketCategory).color || '#ccc' }"></span>
      </template>
      <template #actions="{ row }">
        <el-button link type="primary" @click="openEdit(row as TicketCategory)">编辑</el-button>
        <el-button link type="danger" @click="handleDelete(row as TicketCategory)">删除</el-button>
      </template>
    </BaseTable>

    <BaseDialog
      v-model="dialogVisible"
      :title="editingId != null ? '编辑票档' : '新建票档'"
      :confirm-loading="saving"
      @confirm="handleConfirm"
    >
      <el-alert
        v-if="editingId == null"
        type="info"
        :closable="false"
        show-icon
        title="新建票档后将自动生成 3 行 × 12 列 = 36 个座位"
        description="座位区域名与票档名称一致，可在座位管理中单独调整。"
        style="margin-bottom: 16px"
      />
      <el-alert
        v-else
        type="warning"
        :closable="false"
        show-icon
        title="修改名称或价格会同步更新已生成座位的价格和区域名"
        style="margin-bottom: 16px"
      />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如 VIP区 / 山顶位" />
        </el-form-item>
        <el-form-item label="价格(元)" prop="priceYuan">
          <el-input-number
            v-model="form.priceYuan"
            :min="0"
            :precision="2"
            :step="50"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <el-color-picker v-model="form.color" />
        </el-form-item>
        <el-form-item label="总量" prop="totalQuantity">
          <el-input-number v-model="form.totalQuantity" :min="0" :step="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="限购数" prop="limitPerUser">
          <el-input-number v-model="form.limitPerUser" :min="1" :max="10" :step="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填" />
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
.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}
.color-box {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  vertical-align: middle;
  border: 1px solid var(--color-border);
}
</style>

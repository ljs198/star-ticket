<!--
  演出新建/编辑（views/admin/event/EventEdit.vue）
  知识点：
  1. 路由复用：/admin/events/new 与 /admin/events/:id/edit 共用本组件
     有 route.params.id -> 编辑模式（拉详情回填），否则新建模式
  2. el-form + FormRules 校验：标题/场馆/城市/分类/状态必填
  3. el-date-picker type=datetime，value-format=YYYY-MM-DD HH:mm:ss（东八区字符串）
  4. 金额输入单位元，提交单位分：Math.round(yuan * 100)；回显时 /100
  5. 提交：有 id -> adminEventApi.update，否则 adminEventApi.create
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { adminEventApi } from '@/api'
import type { EventItem, EventStatus } from '@/api/types'

const route = useRoute()
const router = useRouter()

const editId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => editId.value != null)

const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)

const CATEGORIES = ['演唱会', '话剧', '体育赛事', '音乐会']
const STATUS_OPTIONS: { label: string; value: EventStatus }[] = [
  { label: '未上架', value: 'DRAFT' },
  { label: '在售', value: 'ON_SALE' },
  { label: '售罄', value: 'SOLD_OUT' },
  { label: '已结束', value: 'END' }
]

const form = reactive({
  title: '',
  poster: '',
  venue: '',
  city: '',
  category: '',
  status: 'DRAFT' as EventStatus,
  showTime: '',
  saleStartTime: '',
  saleEndTime: '',
  minPriceYuan: undefined as number | undefined,
  maxPriceYuan: undefined as number | undefined,
  description: ''
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入演出名称', trigger: 'blur' }],
  venue: [{ required: true, message: '请输入场馆', trigger: 'blur' }],
  city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

async function fetchDetail() {
  if (!editId.value) return
  loading.value = true
  try {
    const d: EventItem = await adminEventApi.detail(editId.value)
    form.title = d.title ?? ''
    form.poster = d.poster ?? ''
    form.venue = d.venue ?? ''
    form.city = d.city ?? ''
    form.category = d.category ?? ''
    form.status = d.status ?? 'DRAFT'
    form.showTime = d.showTime ?? ''
    form.saleStartTime = d.saleStartTime ?? ''
    form.saleEndTime = d.saleEndTime ?? ''
    form.minPriceYuan = d.minPrice != null ? d.minPrice / 100 : undefined
    form.maxPriceYuan = d.maxPrice != null ? d.maxPrice / 100 : undefined
    form.description = d.description ?? ''
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const data: Partial<EventItem> = {
        title: form.title,
        poster: form.poster || undefined,
        venue: form.venue,
        city: form.city,
        category: form.category,
        status: form.status,
        showTime: form.showTime || undefined,
        saleStartTime: form.saleStartTime || undefined,
        saleEndTime: form.saleEndTime || undefined,
        minPrice: form.minPriceYuan != null ? Math.round(form.minPriceYuan * 100) : undefined,
        maxPrice: form.maxPriceYuan != null ? Math.round(form.maxPriceYuan * 100) : undefined,
        description: form.description || undefined
      }
      if (isEdit.value && editId.value != null) {
        await adminEventApi.update(editId.value, data)
        ElMessage.success('更新成功')
      } else {
        await adminEventApi.create(data)
        ElMessage.success('创建成功')
      }
      router.push('/admin/events')
    } finally {
      saving.value = false
    }
  })
}

function goBack() {
  router.push('/admin/events')
}

onMounted(fetchDetail)
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <h2 class="page-title">{{ isEdit ? '编辑演出' : '新建演出' }}</h2>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />
    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="edit-form"
    >
      <el-form-item label="演出名称" prop="title">
        <el-input v-model="form.title" placeholder="请输入演出名称" maxlength="80" />
      </el-form-item>
      <el-form-item label="海报 URL" prop="poster">
        <el-input v-model="form.poster" placeholder="https://..." />
      </el-form-item>
      <el-form-item label="场馆" prop="venue">
        <el-input v-model="form.venue" placeholder="请输入场馆" />
      </el-form-item>
      <el-form-item label="城市" prop="city">
        <el-input v-model="form.city" placeholder="请输入城市" />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select v-model="form.category" placeholder="请选择分类">
          <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
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
      <el-form-item label="演出时间" prop="showTime">
        <el-date-picker
          v-model="form.showTime"
          type="datetime"
          placeholder="选择演出时间"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
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
      <el-form-item label="最低价(元)" prop="minPriceYuan">
        <el-input-number
          v-model="form.minPriceYuan"
          :min="0"
          :precision="2"
          :step="10"
          placeholder="单位：元"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="最高价(元)" prop="maxPriceYuan">
        <el-input-number
          v-model="form.maxPriceYuan"
          :min="0"
          :precision="2"
          :step="10"
          placeholder="单位：元"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="演出介绍" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="请输入演出介绍"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
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
.edit-form {
  max-width: 640px;
  margin-top: 12px;
}
</style>

<!--
  个人中心（views/user/profile/Profile.vue）
  知识点：
  1. userStore.user 展示用户信息（username/nickname/role/phone）
  2. 编辑昵称/手机号表单 -> authApi.updateProfile -> userStore.fetchProfile 刷新
  3. 退出登录：userStore.logout 后跳转首页
  4. role 展示：USER/ADMIN 文案化
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'
import { useUserStore } from '@/stores'

const router = useRouter()
const userStore = useUserStore()

const saving = ref(false)
const form = reactive({
  nickname: '',
  phone: ''
})

const user = computed(() => userStore.user)
const roleText = computed(() => (userStore.isAdmin ? '管理员' : '普通用户'))

function syncForm() {
  form.nickname = user.value?.nickname ?? ''
  form.phone = user.value?.phone ?? ''
}

async function handleSave() {
  if (form.phone && !/^1\d{10}$/.test(form.phone)) {
    ElMessage.error('手机号格式不正确')
    return
  }
  saving.value = true
  try {
    await authApi.updateProfile({ nickname: form.nickname, phone: form.phone })
    await userStore.fetchProfile()
    ElMessage.success('资料已更新')
  } finally {
    saving.value = false
  }
}

async function handleLogout() {
  await userStore.logout()
  router.push('/events')
}

onMounted(() => {
  // 若无用户信息则拉取
  if (!user.value) {
    userStore.fetchProfile().then(syncForm)
  } else {
    syncForm()
  }
})
</script>

<template>
  <div class="page">
    <div class="page-body">
      <section class="card section">
        <h3 class="section-title">基本信息</h3>
        <div class="info-row">
          <span class="info-label">用户名</span>
          <span class="info-value">{{ user?.username ?? '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">角色</span>
          <span class="info-value">{{ roleText }}</span>
        </div>
      </section>

      <section class="card section">
        <h3 class="section-title">编辑资料</h3>
        <div class="form">
          <div class="form-item">
            <label class="form-label">昵称</label>
            <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="30" />
          </div>
          <div class="form-item">
            <label class="form-label">手机号</label>
            <el-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" />
          </div>
          <div class="form-actions">
            <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          </div>
        </div>
      </section>

      <section class="card section">
        <h3 class="section-title">账号操作</h3>
        <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-body {
  padding: 8px 0 24px;
}
.section {
  padding: 16px 20px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}
.info-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}
.info-label {
  width: 80px;
  color: var(--color-text-secondary);
}
.info-value {
  color: var(--color-text);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 360px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.form-actions {
  margin-top: 8px;
}

/* ========== 移动端 ========== */
@media (max-width: $bp-tablet) {
  .page-body {
    padding: 8px 0 calc(24px + 56px);
  }
  .section {
    padding: 14px;
    margin-bottom: 12px;
  }
  .form {
    max-width: none;
  }
  .form-actions :deep(.el-button) {
    width: 100%;
  }
  .section:last-child :deep(.el-button) {
    width: 100%;
  }
}
</style>

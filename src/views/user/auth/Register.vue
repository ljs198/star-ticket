<!--
  注册页（views/user/auth/Register.vue）
  知识点：
  1. el-form 自定义校验器：confirmPassword 与 password 比较
  2. 注册成功后自动登录（store 内已实现）并跳转首页
  3. 用户名/密码/昵称/手机号字段
-->
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElButton, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  phone: ''
})

const validateConfirm = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

/** 密码强度校验：8-32 位且必须同时包含字母和数字（PRD 注册规则） */
const validatePassword = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (!value) {
    callback(new Error('请输入密码'))
    return
  }
  if (value.length < 8 || value.length > 32) {
    callback(new Error('密码长度需 8-32 位'))
    return
  }
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    callback(new Error('密码必须同时包含字母和数字'))
    return
  }
  callback()
}

/** 用户名校验：4-20 位字母/数字/下划线（PRD 注册规则） */
const validateUsername = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (!value) {
    callback(new Error('请输入用户名'))
    return
  }
  if (value.length < 4 || value.length > 20) {
    callback(new Error('用户名长度需 4-20 位'))
    return
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    callback(new Error('用户名仅支持字母、数字、下划线'))
    return
  }
  callback()
}

const rules: FormRules = {
  username: [
    { required: true, validator: validateUsername, trigger: 'blur' }
  ],
  password: [
    { required: true, validator: validatePassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ],
  phone: [{ pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' }]
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await userStore.register({
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        phone: form.phone
      })
      router.push('/events')
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <div class="register-page">
    <div class="register-card card">
      <h2 class="title">注册星幕票务</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="4-20 位字母/数字/下划线" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="8-32 位，须含字母和数字" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入密码" />
        </el-form-item>
        <el-form-item label="昵称（可选）" prop="nickname">
          <el-input v-model="form.nickname" placeholder="昵称" />
        </el-form-item>
        <el-form-item label="手机号（可选）" prop="phone">
          <el-input v-model="form.phone" placeholder="11 位手机号" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="submit-btn" @click="handleSubmit">注册</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register-page {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.register-card {
  width: 100%;
  max-width: 400px;
  padding: 32px 24px;
}
.title {
  text-align: center;
  font-size: 22px;
  margin-bottom: 24px;
}
.submit-btn {
  width: 100%;
}

/* ========== 移动端 ========== */
@media (max-width: $bp-tablet) {
  .register-page {
    /* 注册页不显示底部 Tab Bar */
    min-height: calc(100dvh - var(--header-height));
    padding: 16px;
  }
  .register-card {
    padding: 24px 16px;
  }
  .title { font-size: 19px; }
}
</style>

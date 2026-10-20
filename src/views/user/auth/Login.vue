<!--
  登录页（views/user/auth/Login.vue）
  知识点：
  1. el-form 表单校验：rules 定义校验规则，ref.validate() 触发
  2. Pinia store：useUserStore.login() 调用接口并持久化 token
  3. redirect query：登录后跳回原页面，避免丢失上下文
  4. 按钮 loading：提交时 loading=true 防重复点击
  5. 路由 query 解析：useRoute().query.redirect
-->
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElButton, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { LoginRequest } from '@/api/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive<LoginRequest>({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ]
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await userStore.login(form)
      const redirect = (route.query.redirect as string) || '/events'
      router.push(redirect)
    } finally {
      loading.value = false
    }
  })
}

function goRegister() {
  router.push('/register')
}
</script>

<template>
  <div class="login-page">
    <div class="login-card card">
      <h2 class="title">登录星幕票务</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" @keyup.enter="handleSubmit" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="submit-btn" @click="handleSubmit">登录</el-button>
        </el-form-item>
        <div class="footer">
          <span>还没有账号？</span>
          <el-button link type="primary" @click="goRegister">立即注册</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-card {
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
.footer {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ========== 移动端 ========== */
@media (max-width: $bp-tablet) {
  .login-page {
    /* 登录页不显示底部 Tab Bar */
    min-height: calc(100dvh - var(--header-height));
    padding: 16px;
  }
  .login-card {
    padding: 24px 16px;
  }
  .title { font-size: 19px; }
}
</style>

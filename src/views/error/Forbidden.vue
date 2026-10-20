<!--
  403 无权限页面（views/error/Forbidden.vue）
  知识点：
  1. 路由守卫角色校验不通过时跳转到此页
  2. 提供返回首页 / 返回上一页 两个出口
-->
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
function goHome() {
  router.push('/events')
}
function goBack() {
  router.back()
}
</script>

<template>
  <div class="forbidden">
    <div class="code">403</div>
    <p class="tip">抱歉，您没有权限访问该页面</p>
    <div class="actions">
      <el-button @click="goBack">返回上一页</el-button>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.forbidden {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--color-bg);
}
.code {
  font-size: 96px;
  font-weight: 800;
  color: var(--color-warning);
  line-height: 1;
}
.tip {
  font-size: 15px;
  color: var(--color-text-secondary);
}
.actions {
  display: flex;
  gap: 12px;
}
</style>

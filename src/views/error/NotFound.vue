<!--
  404 页面（views/error/NotFound.vue）
  知识点：
  1. 简单全屏 404 兜底页
  2. router-link / router.push 跳回演出列表
-->
<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
function goHome() {
  router.push('/events')
}
</script>

<template>
  <div class="not-found">
    <div class="code">404</div>
    <p class="tip">抱歉，您访问的页面不存在或已被移除</p>
    <el-button type="primary" @click="goHome">返回首页</el-button>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  min-height: calc(100dvh - var(--header-height));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--color-bg);
  padding: 16px;
  text-align: center;
}
@media (max-width: $bp-tablet) {
  .code { font-size: 64px; }
  .tip { font-size: 14px; }
}
.code {
  font-size: 96px;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1;
}
.tip {
  font-size: 15px;
  color: var(--color-text-secondary);
}
</style>

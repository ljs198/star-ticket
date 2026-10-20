<!--
  根组件 App.vue
  知识点：
  1. <script setup>：Composition API 的语法糖，自动暴露顶层绑定给模板
  2. ElConfigProvider：Element Plus 全局配置（国际化、按钮 autoInsertSpace）
  3. zhCn：引入 Element Plus 中文语言包
  4. <router-view>：路由出口，匹配到的组件在此渲染
  5. Suspense（可选）：异步组件加载兜底，本工程不强制使用
-->
<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useUserStore } from '@/stores/user'

// 应用启动时从 localStorage 恢复登录态（实现见 stores/user.ts）
const userStore = useUserStore()
userStore.bootstrap()

const locale = zhCn
</script>

<template>
  <el-config-provider :locale="locale" :button="{ autoInsertSpace: true }">
    <router-view />
  </el-config-provider>
</template>

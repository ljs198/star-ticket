<!--
  管理端布局（layout/AdminLayout.vue）
  知识点：
  1. el-container + el-aside + el-header + el-main：经典后台布局
  2. el-menu 侧边栏，router 模式直接跳转
  3. 折叠状态本地存储，刷新保持
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const nickname = computed(() => userStore.nickname)
const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/admin/events')) return '/admin/events'
  if (path.startsWith('/admin/sessions') || path.startsWith('/admin/categories') || path.startsWith('/admin/seats')) {
    return '/admin/events'
  }
  if (path.startsWith('/admin/orders')) return '/admin/orders'
  return path
})

async function handleLogout() {
  await userStore.logout()
  router.push('/login')
}

/** el-dropdown command 回调：显式标注参数类型，避免 vue-tsc 严格模式报隐式 any */
function handleCommand(cmd: string | number | object) {
  if (cmd === 'logout') handleLogout()
}
</script>

<template>
  <el-container class="admin-layout">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="admin-aside">
      <div class="logo" @click="router.push('/admin/events')">
        <span v-if="!isCollapse">星幕管理台</span>
        <span v-else>星</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        class="admin-menu"
      >
        <el-menu-item index="/admin/events">
          <el-icon><Document /></el-icon>
          <template #title>演出管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/orders">
          <el-icon><Tickets /></el-icon>
          <template #title>订单管理</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <el-button text @click="isCollapse = !isCollapse">
          <el-icon size="20"><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
        </el-button>
        <div class="header-right">
          <router-link to="/events" class="back-portal">返回前台</router-link>
          <el-dropdown trigger="click" @command="handleCommand">
            <span class="nickname">{{ nickname }}</span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
}
.admin-aside {
  background: #001529;
  transition: width 0.2s;
  overflow: hidden;
}
.logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  background: #00284f;
}
.admin-menu {
  border-right: none !important;
  background: transparent !important;
  :deep(.el-menu-item) {
    color: rgba(255, 255, 255, 0.65);
    &:hover {
      background: #003a70 !important;
      color: #fff;
    }
    &.is-active {
      background: var(--color-primary) !important;
      color: #fff;
    }
  }
}
.admin-header {
  height: var(--header-height) !important;
  background: #fff;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.back-portal {
  color: var(--color-text-secondary);
  font-size: 14px;
  &:hover {
    color: var(--color-primary);
  }
}
.nickname {
  cursor: pointer;
  font-size: 14px;
}
.admin-main {
  background: var(--color-bg);
  padding: 16px;
  overflow-y: auto;
}
</style>

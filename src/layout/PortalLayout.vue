<!--
  用户端布局（layout/PortalLayout.vue）
  顶部导航参考大麦网：Logo + 城市选择 + 首页/分类 + 搜索栏 + 用户头像下拉
  国庆主题配色（红金）
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { mockCities } from '@/mock/data'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isLogin = computed(() => userStore.isLogin)
const nickname = computed(() => userStore.nickname)
const isAdmin = computed(() => userStore.isAdmin)
const avatar = computed(() => userStore.user?.avatar || '')

/** 当前选中城市 */
const currentCity = ref('北京')
/** 城市下拉是否展开 */
const cityDropdownVisible = ref(false)
/** 搜索关键词 */
const searchKeyword = ref('')
/** 分类下拉是否展开 */
const categoryDropdownVisible = ref(false)
/** 移动端搜索框是否展开 */
const searchExpanded = ref(false)

/** 底部 Tab 配置 */
const tabItems = [
  { key: 'home', label: '首页', icon: 'home', path: '/' },
  { key: 'events', label: '演出', icon: 'ticket', path: '/events' },
  { key: 'orders', label: '订单', icon: 'order', path: '/orders' },
  { key: 'mine', label: '我的', icon: 'user', path: '/profile' }
]
/** 当前激活的 Tab */
const activeTab = computed(() => {
  if (route.path === '/') return 'home'
  if (route.path.startsWith('/events')) return 'events'
  if (route.path.startsWith('/orders')) return 'orders'
  if (route.path.startsWith('/profile') || route.path.startsWith('/reservations')) return 'mine'
  return ''
})
function goTab(path: string) {
  if (route.path !== path) router.push(path)
}

const CATEGORIES = ['演唱会', '话剧', '体育赛事', '音乐会']

function goHome() {
  router.push('/')
}

function goCategory(category?: string) {
  categoryDropdownVisible.value = false
  if (category) {
    router.push({ path: '/events', query: { category } })
  } else {
    router.push('/events')
  }
}

function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (kw) {
    router.push({ path: '/events', query: { keyword: kw } })
  } else {
    router.push('/events')
  }
}

function goLogin() {
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

async function handleLogout() {
  await userStore.logout()
  router.push('/')
}

function goAdmin() {
  router.push('/admin/events')
}

function handleCommand(cmd: string) {
  if (cmd === 'profile') router.push('/profile')
  else if (cmd === 'orders') router.push('/orders')
  else if (cmd === 'logout') handleLogout()
}
</script>

<template>
  <div class="portal-layout">
    <header class="portal-header">
      <div class="portal-header__inner">
        <!-- Logo + 城市 -->
        <div class="header-left">
          <div class="logo" @click="goHome">
            <span class="logo-icon">★</span>
            <span class="logo-text">星幕票务</span>
          </div>
          <el-dropdown
            v-model:visible="cityDropdownVisible"
            trigger="click"
            @command="(c: string) => (currentCity = c)"
          >
            <div class="city-selector">
              <svg class="city-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              <span>{{ currentCity }}</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="city-dropdown">
                <div class="city-section">
                  <span class="city-label">当前城市</span>
                  <el-dropdown-item :command="currentCity" class="active">{{ currentCity }}</el-dropdown-item>
                </div>
                <div class="city-section">
                  <span class="city-label">热门城市</span>
                  <div class="city-grid">
                    <el-dropdown-item
                      v-for="c in mockCities.slice(0, 12)"
                      :key="c"
                      :command="c"
                      class="city-item"
                    >{{ c }}</el-dropdown-item>
                  </div>
                </div>
                <div class="city-section">
                  <span class="city-label">其他城市</span>
                  <div class="city-grid">
                    <el-dropdown-item
                      v-for="c in mockCities.slice(12)"
                      :key="c"
                      :command="c"
                      class="city-item"
                    >{{ c }}</el-dropdown-item>
                  </div>
                </div>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- 首页 / 分类 -->
        <nav class="header-nav">
          <router-link to="/" class="nav-link" :class="{ active: route.path === '/' }">首页</router-link>
          <el-dropdown
            v-model:visible="categoryDropdownVisible"
            trigger="click"
            @command="(c: string) => goCategory(c)"
          >
            <span class="nav-link" :class="{ active: route.path.startsWith('/events') }">
              分类
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="全部">全部演出</el-dropdown-item>
                <el-dropdown-item v-for="c in CATEGORIES" :key="c" :command="c">{{ c }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </nav>

        <!-- 搜索栏 -->
        <div class="header-search" :class="{ expanded: searchExpanded }">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索明星、演出、体育赛事"
            class="search-input"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </template>
          </el-input>
          <el-button class="search-btn" type="primary" @click="handleSearch">搜索</el-button>
          <!-- 移动端搜索图标（点击展开搜索框） -->
          <div class="search-icon-mobile" @click="searchExpanded = !searchExpanded">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>

        <!-- 用户区 -->
        <div class="header-actions">
          <template v-if="isLogin">
            <el-dropdown trigger="click" @command="handleCommand">
              <div class="user-area">
                <div class="avatar" :style="avatar ? { backgroundImage: `url(${avatar})` } : {}">
                  <template v-if="!avatar">{{ nickname.charAt(0) }}</template>
                </div>
                <span class="nickname">{{ nickname }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                  <el-dropdown-item command="profile">账号设置</el-dropdown-item>
                  <el-dropdown-item command="orders">订单管理</el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" @click="goAdmin">管理后台</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button class="login-btn" @click="goLogin">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>登录</span>
            </el-button>
          </template>
        </div>
      </div>
    </header>
    <main class="portal-main">
      <router-view />
    </main>

    <!-- 底部 Tab Bar（仅移动端显示） -->
    <nav class="tab-bar" v-if="activeTab">
      <div
        v-for="tab in tabItems"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="goTab(tab.path)"
      >
        <svg class="tab-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="tab.icon === 'home'">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </template>
          <template v-else-if="tab.icon === 'ticket'">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
            <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
          </template>
          <template v-else-if="tab.icon === 'order'">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </template>
          <template v-else-if="tab.icon === 'user'">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </template>
        </svg>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </nav>
  </div>
</template>

<style scoped lang="scss">
.portal-layout {
  min-height: 100vh;
  background: var(--color-bg);
}
.portal-header {
  position: sticky;
  top: 0;
  height: 64px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(200, 16, 46, 0.12);
  z-index: 100;
  border-bottom: 2px solid var(--color-gold);
}
.portal-header__inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
}

/* Logo + 城市 */
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.logo-icon {
  font-size: 22px;
  color: var(--color-gold);
  text-shadow: 0 0 8px rgba(212, 175, 55, 0.5);
}
.logo-text {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary), var(--color-gold));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.city-selector {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
  &:hover { background: var(--color-bg-muted); }
}
.city-icon { color: var(--color-primary); }

/* 首页/分类 */
.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  text-decoration: none;
  &:hover { color: var(--color-primary); }
  &.active {
    color: var(--color-primary);
    background: rgba(200, 16, 46, 0.08);
  }
}

/* 搜索栏 */
.header-search {
  flex: 1;
  max-width: 520px;
  display: flex;
  align-items: center;
  gap: 0;
}
.search-input {
  flex: 1;
  :deep(.el-input__wrapper) {
    border-radius: 20px 0 0 20px;
    border-color: var(--color-primary);
    box-shadow: none;
  }
}
.search-btn {
  border-radius: 0 20px 20px 0;
  height: 32px;
  padding: 0 20px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border: none;
  font-weight: 600;
}

/* 用户区 */
.header-actions {
  flex-shrink: 0;
}
.login-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 0 16px;
  height: 32px;
  font-size: 14px;
  &:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
}
.user-area {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: background 0.2s;
  &:hover { background: var(--color-bg-muted); }
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-gold));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  background-size: cover;
  background-position: center;
}
.nickname {
  font-size: 14px;
  color: var(--color-text);
}

/* 城市下拉 */
.city-dropdown {
  padding: 12px;
  min-width: 320px;
}
.city-section {
  margin-bottom: 10px;
  &:last-child { margin-bottom: 0; }
}
.city-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin-bottom: 6px;
  padding: 0 8px;
}
.city-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.city-item {
  text-align: center;
  font-size: 13px;
  &.active { color: var(--color-primary); font-weight: 600; }
}

.portal-main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
  min-height: calc(100vh - 64px);
}

/* 移动端搜索图标（默认隐藏，移动端显示） */
.search-icon-mobile {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-primary);
  cursor: pointer;
}

/* ========== 移动端（≤768px） ========== */
@media (max-width: $bp-tablet) {
  .portal-header {
    height: 48px;
  }
  .portal-header__inner {
    padding: 0 12px;
    gap: 8px;
  }
  /* 隐藏桌面端导航 */
  .header-nav { display: none; }
  /* Logo 缩小 */
  .logo-text { font-size: 16px; }
  .logo-icon { font-size: 18px; }
  /* 城市选择器只显示图标 */
  .city-selector span:nth-child(2) { display: none; }
  /* 搜索栏：默认隐藏输入框，显示搜索图标 */
  .header-search {
    flex: 0 0 auto;
  }
  .header-search .search-input,
  .header-search .search-btn {
    display: none;
  }
  .search-icon-mobile { display: flex; }
  /* 搜索展开时：全屏覆盖式搜索 */
  .header-search.expanded {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 48px;
    background: #fff;
    z-index: 200;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  }
  .header-search.expanded .search-input { display: block; flex: 1; }
  .header-search.expanded .search-btn { display: block; }
  .header-search.expanded .search-icon-mobile { display: none; }
  /* 用户区：隐藏昵称，只保留头像 */
  .nickname { display: none; }
  .avatar { width: 28px; height: 28px; font-size: 12px; }
  .login-btn span { display: none; }
  .login-btn { padding: 0; border: none; }

  /* 主内容区：去掉最大宽度，底部留出 Tab Bar 高度 */
  .portal-main {
    max-width: none;
    padding: 0 12px;
    min-height: calc(100dvh - 48px - 56px);
    padding-bottom: calc(56px + env(safe-area-inset-bottom));
  }

  /* 城市下拉移动端宽度 */
  .city-dropdown {
    min-width: 280px;
  }
  .city-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ========== 底部 Tab Bar ========== */
.tab-bar {
  display: none; /* 桌面端隐藏 */
}
@media (max-width: $bp-tablet) {
  .tab-bar {
    display: flex;
    position: fixed;
    left: 0; right: 0; bottom: 0;
    height: calc(56px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: #fff;
    box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
    border-top: 1px solid var(--color-border);
    z-index: 100;
  }
  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--color-text-placeholder);
    cursor: pointer;
    transition: color 0.2s;
    min-height: 56px;
  }
  .tab-item.active {
    color: var(--color-primary);
  }
  .tab-icon {
    width: 22px; height: 22px;
  }
  .tab-label {
    font-size: 11px;
    font-weight: 500;
  }
}
</style>

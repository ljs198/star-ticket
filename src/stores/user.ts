/**
 * 用户 Store（stores/user.ts）
 *
 * 知识点：
 * 1. Pinia Setup Store（函数式）：用 ref + computed 定义状态，比 Options Store 更灵活
 * 2. 状态：token、user、role（前端权限控制核心）
 * 3. 持久化：token 与 user 存 localStorage，刷新页面后 bootstrap() 恢复
 * 4. 登录：调 authApi，存 token/user，重定向回原页面
 * 5. 登录态判定：token 存在即视为已登录，不实时校验过期（由后端 401 触发踢出）
 * 6. role：'USER' | 'ADMIN'，路由守卫与 v-permission 指令依赖此字段
 * 7. 路由跳转：通过 router 实例跳转，但 store 不直接 import router（避免循环依赖）
 *    由调用方 router 实例传入，或用 useRouter() 在 setup 中调用
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { LoginRequest, UserInfo } from '@/api/types'
import {
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  clearAuth
} from '@/utils/auth'

export const useUserStore = defineStore('user', () => {
  /* ============== state ============== */
  const token = ref<string | null>(null)
  const user = ref<UserInfo | null>(null)

  /* ============== getters ============== */
  const isLogin = computed(() => !!token.value)
  const role = computed(() => user.value?.role ?? 'USER')
  const isAdmin = computed(() => role.value === 'ADMIN')
  const nickname = computed(() => user.value?.nickname ?? user.value?.username ?? '游客')

  /* ============== actions ============== */
  /**
   * 应用启动时从 localStorage 恢复登录态
   * 由 main.ts -> App.vue 调用一次
   */
  function bootstrap() {
    const t = getToken()
    if (t) {
      token.value = t
      user.value = getStoredUser<UserInfo>()
    }
  }

  /**
   * 登录
   * @param data 用户名/密码
   * @returns 登录用户信息
   */
  async function login(data: LoginRequest) {
    const res = await authApi.login(data)
    token.value = res.token
    user.value = res.user
    setToken(res.token)
    setStoredUser(res.user)
    return res.user
  }

  /**
   * 注册（注册成功后自动登录）
   */
  async function register(data: { username: string; password: string; nickname?: string; phone?: string }) {
    const res = await authApi.register(data)
    token.value = res.token
    user.value = res.user
    setToken(res.token)
    setStoredUser(res.user)
    return res.user
  }

  /**
   * 拉取最新用户信息（修改个人资料后刷新）
   */
  async function fetchProfile() {
    const u = await authApi.getProfile()
    user.value = u
    setStoredUser(u)
    return u
  }

  /**
   * 退出登录
   * 清空 store + localStorage，跳转登录页
   */
  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* 忽略后端失败，仍前端清理 */
    }
    reset()
  }

  /**
   * 清空状态（被 401 踢出时用）
   */
  function reset() {
    token.value = null
    user.value = null
    clearAuth()
  }

  return {
    // state
    token,
    user,
    // getters
    isLogin,
    role,
    isAdmin,
    nickname,
    // actions
    bootstrap,
    login,
    register,
    fetchProfile,
    logout,
    reset
  }
})

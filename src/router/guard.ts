/**
 * 路由守卫（router/guard.ts）
 *
 * 知识点：
 * 1. beforeEach：全局前置守卫，每次跳转前触发
 * 2. meta.requiresAuth：路由元信息，标记是否需登录
 * 3. meta.roles：需具备的角色列表
 * 4. redirect query：登录后跳回原页面，避免用户丢失上下文
 * 5. token 校验：只判存在性，过期由后端 401 触发踢出（懒校验）
 * 6. document.title：路由切换同步更新页面标题
 */
import type { Router } from 'vue-router'
import { useUserStore } from '@/stores/user'

const APP_TITLE = '星幕票务'

export function setupRouterGuard(router: Router) {
  router.beforeEach((to, _from, next) => {
    const userStore = useUserStore()
    const requiresAuth = to.meta.requiresAuth as boolean
    const roles = to.meta.roles as string[] | undefined

    // 设置页面标题
    const title = (to.meta.title as string) || ''
    document.title = title ? `${title} - ${APP_TITLE}` : APP_TITLE

    // 不需要登录的页面直接放行
    if (!requiresAuth) {
      next()
      return
    }

    // 需要登录但未登录 -> 跳登录页带 redirect
    // 注意：不要手动 encodeURIComponent，Vue Router 构造 URL 时会自动编码 query
    if (!userStore.isLogin) {
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }

    // 需要特定角色但不具备 -> 403
    if (roles && !roles.includes(userStore.role)) {
      next({ path: '/403' })
      return
    }

    next()
  })
}

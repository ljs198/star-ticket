/**
 * 路由实例（router/index.ts）
 *
 * 知识点：
 * 1. createWebHistory：HTML5 history 模式，URL 无 #
 * 2. scrollBehavior：切换路由时滚动到顶部（带锚点则滚到锚点）
 * 3. 守卫通过 setupRouterGuard 在此注册
 * 4. 路由表从 routes/index.ts 统一汇总
 */
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { setupRouterGuard } from './guard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})

// 注册全局守卫
setupRouterGuard(router)

export default router

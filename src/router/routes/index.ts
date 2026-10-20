/**
 * 路由汇总（router/routes/index.ts）
 *
 * 知识点：
 * 1. 顶层路由按布局分组：用户端（PortalLayout）+ 管理端（AdminLayout）
 * 2. 404 兜底放最后，匹配优先级低于具名路由
 */
import type { RouteRecordRaw } from 'vue-router'
import userRoutes from './user'
import adminRoutes from './admin'

/**
 * 用户端顶层路由：统一套用 PortalLayout
 * 子路由不套布局，每个页面都是独立路由
 */
const portalRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layout/PortalLayout.vue'),
    children: [...userRoutes]
  }
]

const routes: RouteRecordRaw[] = [
  ...portalRoutes,
  ...adminRoutes,
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/Forbidden.vue'),
    meta: { title: '无权限' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

export default routes

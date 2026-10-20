/**
 * 管理端路由（router/routes/admin.ts）
 *
 * 知识点：
 * 1. 嵌套路由 children：父路由用 AdminLayout，子路由用具体页面
 * 2. 路径前缀 /admin，meta.requiresAuth + meta.roles=['ADMIN']
 * 3. 嵌套资源路径：/admin/events/:id/sessions、/admin/sessions/:id/categories、/admin/sessions/:id/seats
 * 4. 列表/编辑分离：EventManage 列表、EventEdit 编辑（新增/修改合一）
 */
import type { RouteRecordRaw } from 'vue-router'

const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('@/layout/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['ADMIN'] },
    redirect: '/admin/events',
    children: [
      {
        path: 'events',
        name: 'AdminEventManage',
        component: () => import('@/views/admin/event/EventManage.vue'),
        meta: { title: '演出管理' }
      },
      {
        path: 'events/new',
        name: 'AdminEventNew',
        component: () => import('@/views/admin/event/EventEdit.vue'),
        meta: { title: '新建演出' }
      },
      {
        path: 'events/:id/edit',
        name: 'AdminEventEdit',
        component: () => import('@/views/admin/event/EventEdit.vue'),
        meta: { title: '编辑演出' }
      },
      {
        path: 'events/:id/sessions',
        name: 'AdminSessionManage',
        component: () => import('@/views/admin/session/SessionManage.vue'),
        meta: { title: '场次管理' }
      },
      {
        path: 'sessions/:id/categories',
        name: 'AdminCategoryManage',
        component: () => import('@/views/admin/category/CategoryManage.vue'),
        meta: { title: '票档管理' }
      },
      {
        path: 'sessions/:id/seats',
        name: 'AdminSeatManage',
        component: () => import('@/views/admin/seat/SeatManage.vue'),
        meta: { title: '座位管理' }
      },
      {
        path: 'orders',
        name: 'AdminOrderManage',
        component: () => import('@/views/admin/order/OrderManage.vue'),
        meta: { title: '订单管理' }
      }
    ]
  }
]

export default adminRoutes

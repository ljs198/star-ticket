/**
 * 用户端路由（router/routes/user.ts）
 *
 * 知识点：
 * 1. component: () => import()：路由懒加载，按需分包
 * 2. meta：路由元信息，守卫读取 meta.title / meta.requiresAuth / meta.roles
 * 3. 路径与 PRD v2.0 第 3 章一致：
 *    /events、/events/:id、/sessions/:id、/seats/:sessionId、
 *    /orders/confirm、/orders、/orders/:orderNo、/pay/:orderNo、
 *    /reservations、/profile、/login、/register
 * 4. 根路径 / 重定向到 /events
 */
import type { RouteRecordRaw } from 'vue-router'

const userRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/user/home/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/events',
    name: 'EventList',
    component: () => import('@/views/user/event/EventList.vue'),
    meta: { title: '演出列表' }
  },
  {
    path: '/events/:id',
    name: 'EventDetail',
    component: () => import('@/views/user/event/EventDetail.vue'),
    meta: { title: '演出详情' }
  },
  {
    path: '/sessions/:id',
    name: 'SessionDetail',
    component: () => import('@/views/user/session/SessionDetail.vue'),
    meta: { title: '场次详情' }
  },
  {
    path: '/seats/:sessionId',
    name: 'SeatSelection',
    component: () => import('@/views/user/seat/SeatSelection.vue'),
    meta: { title: '在线选座', requiresAuth: true }
  },
  {
    path: '/orders/confirm',
    name: 'OrderConfirm',
    component: () => import('@/views/user/order/OrderConfirm.vue'),
    meta: { title: '确认订单', requiresAuth: true }
  },
  {
    path: '/orders',
    name: 'OrderList',
    component: () => import('@/views/user/order/OrderList.vue'),
    meta: { title: '我的订单', requiresAuth: true }
  },
  {
    path: '/orders/:orderNo',
    name: 'OrderDetail',
    component: () => import('@/views/user/order/OrderDetail.vue'),
    meta: { title: '订单详情', requiresAuth: true }
  },
  {
    path: '/pay/:orderNo',
    name: 'PayMock',
    component: () => import('@/views/user/payment/PayMock.vue'),
    meta: { title: '收银台', requiresAuth: true }
  },
  {
    path: '/reservations',
    name: 'MyReservations',
    component: () => import('@/views/user/reservation/MyReservations.vue'),
    meta: { title: '我的预约', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/user/profile/Profile.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/user/auth/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/user/auth/Register.vue'),
    meta: { title: '注册' }
  }
]

export default userRoutes

/**
 * API 统一出口（api/modules/index.ts）
 *
 * 知识点：
 * 1. barrel pattern（桶模式）：统一导出，业务侧 `import { orderApi } from '@/api'`
 * 2. 用户端与管理端分两个命名空间，避免命名冲突
 * 3. 后续若新增模块，在此处补充 export
 */
export { default as authApi } from './auth'
export { default as eventApi } from './event'
export { default as sessionApi } from './session'
export { default as seatApi } from './seat'
export { default as orderApi } from './order'
export { default as paymentApi } from './payment'
export { default as reservationApi } from './reservation'

export { default as adminEventApi } from './admin/event'
export { default as adminSessionApi } from './admin/session'
export { default as adminCategoryApi } from './admin/category'
export { default as adminSeatApi } from './admin/seat'
export { default as adminOrderApi } from './admin/order'

export * as adminApi from './admin/index'

/**
 * 接口类型定义（api/types.ts）
 *
 * 知识点：
 * 1. interface / type：TS 类型声明，前后端契约的 TS 表达
 * 2. 命名约定：前端统一 camelCase，后端 snake_case 由后端约定返回 camel
 *    （如后端返回 snake，在 http.ts 拦截器中转 camel，或后端直接返 camel）
 * 3. 分页响应统一结构 { records, total, page, size }
 * 4. 枚举与 utils/*-status.ts 中保持一致
 */

import type { OrderStatus } from '@/utils/order-status'
import type { SeatStatus, SeatLockFailReason } from '@/utils/seat-status'

/* ============== 通用类型 ============== */

/** 统一分页响应（PRD v2.0 第 8 章） */
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}

/** 分页请求参数 */
export interface PageQuery {
  page: number
  size: number
}

/* ============== Auth ============== */

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresIn: number /** 7200 秒 */
  user: UserInfo
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  role: 'USER' | 'ADMIN'
  phone?: string
  avatar?: string
}

export interface RegisterRequest {
  username: string
  password: string
  nickname?: string
  phone?: string
}

/* ============== Event（演出） ============== */

export type EventStatus = 'DRAFT' | 'ON_SALE' | 'SOLD_OUT' | 'END'

export interface EventItem {
  id: number
  title: string
  poster?: string
  venue: string
  city: string
  category: string
  status: EventStatus
  showTime?: string
  saleStartTime?: string
  saleEndTime?: string
  minPrice?: number
  maxPrice?: number
  description?: string
}

/** 演出排序方式（PRD 8.3）：热度/时间/价格 */
export type EventSort = 'heat_desc' | 'time_desc' | 'price_asc' | 'price_desc'

export interface EventListQuery extends PageQuery {
  keyword?: string
  city?: string
  category?: string
  status?: EventStatus
  /** 价格区间下限（单位：分） */
  minPrice?: number
  /** 价格区间上限（单位：分） */
  maxPrice?: number
  /** 排序方式 */
  sort?: EventSort
}

/* ============== Session（场次） ============== */

export type SessionStatus = 'NOT_STARTED' | 'ON_SALE' | 'SOLD_OUT' | 'ENDED'

export interface SessionItem {
  id: number
  eventId: number
  showTime: string
  venue: string
  status: SessionStatus
  saleStartTime: string
  saleEndTime: string
  remainingCount?: number
  minPrice?: number
}

/* ============== Category（票档） ============== */

export interface TicketCategory {
  id: number
  sessionId: number
  name: string
  price: number /** 单位：分 */
  color?: string
  totalQuantity: number
  soldQuantity: number
  remainingQuantity: number
  limitPerUser: number
  description?: string
}

/* ============== Seat（座位） ============== */

export interface Seat {
  id: number
  row: string /** A/B/C... */
  col: number
  area: string
  status: SeatStatus
  lockUserId?: number
  lockExpireAt?: string
  categoryId?: number
  price?: number
}

export interface SeatLockRequest {
  sessionId: number
  seatIds: number[]
}

export interface SeatLockResultItem {
  seatId: number
  success: boolean
  failReason?: SeatLockFailReason
}

export interface SeatLockResponse {
  expireAt: string
  results: SeatLockResultItem[]
}

export interface SeatArea {
  area: string
  seats: Seat[]
  rows: string[]
}

/* ============== Order（订单） ============== */

export type OrderType = 'NORMAL' | 'SEAT'

export interface Attendee {
  name: string
  phone: string
  idCard?: string
}

export interface OrderItem {
  ticketCategoryId: number
  quantity: number
  seatIds?: number[]
}

export interface CreateOrderRequest {
  sessionId: number
  orderType: OrderType
  items: OrderItem[]
  attendees: Attendee[]
}

export interface CreateOrderResponse {
  orderNo: string
  payAmount: number /** 单位：分 */
  status: OrderStatus
  expireTime: string
}

export interface OrderListItem {
  orderNo: string
  sessionId: number
  eventTitle: string
  showTime: string
  venue: string
  payAmount: number
  status: OrderStatus
  expireTime?: string
  createTime: string
  orderType: OrderType
  items: OrderItemWithDetail[]
  /** 下单用户名（管理端列表展示/筛选） */
  username?: string
}

export interface OrderItemWithDetail {
  ticketCategoryId: number
  categoryName: string
  price: number
  quantity: number
  seatIds?: number[]
  seatLabels?: string[]
}

export interface OrderDetail extends OrderListItem {
  attendees: Attendee[]
  payTime?: string
  payNo?: string
}

export interface OrderListQuery extends PageQuery {
  status?: OrderStatus
  /** 订单号模糊查询（管理端） */
  orderNo?: string
  /** 用户名模糊查询（管理端） */
  username?: string
  /** 下单时间下限 ISO（管理端） */
  startTime?: string
  /** 下单时间上限 ISO（管理端） */
  endTime?: string
}

/* ============== Payment（支付） ============== */

export interface PayMockRequest {
  orderNo: string
  amount: number
  payNo: string
}

export interface PayMockResponse {
  payNo: string
  orderStatus: OrderStatus
  duplicated: boolean
}

/* ============== Reservation（预约） ============== */

export interface ReservationRequest {
  sessionId: number
  categoryId: number
}

export interface ReservationItem {
  id: number
  sessionId: number
  categoryId: number
  eventTitle: string
  showTime: string
  categoryName: string
  status: 'PENDING' | 'NOTIFIED' | 'CANCELED'
  createTime: string
}

/**
 * Mock 适配器（src/mock/index.ts）
 *
 * 知识点：
 * 1. axios adapter：自定义请求处理函数，绕过真实网络请求
 * 2. 路由匹配：按 method + path（含 :param 正则）匹配 handler
 * 3. 统一响应：{ code:0, message, data, traceId }，与后端契约一致
 * 4. 内存态：订单/预约的创建/取消修改 mockOrders/mockReservations 数组
 * 5. 开关：VITE_USE_MOCK=true 时启用，false 时走真实后端
 *
 * 用法：在 http.ts 中 axios.create({ adapter: useMock ? mockAdapter : undefined })
 */
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import type {
  CreateOrderRequest,
  SeatLockRequest,
  PayMockRequest,
  ReservationRequest,
  EventStatus,
  SessionStatus,
  TicketCategory,
  Seat
} from '@/api/types'
import { OrderStatus } from '@/utils/order-status'
import { SeatStatus } from '@/utils/seat-status'
import {
  mockUsers,
  mockEvents,
  mockSessions,
  mockCategories,
  generateSeats,
  mockOrders,
  mockReservations,
  getOrderDetail
} from './data'
import { uuid } from '@/utils/idempotency'
import { formatDateTime } from '@/utils/format'

/** 构造统一成功响应 */
function ok<T>(data: T) {
  return { code: 0, message: 'success', data, traceId: 'mock-' + uuid().slice(0, 8) }
}

/** 构造统一失败响应 */
function fail(code: number, message: string) {
  return { code, message, data: null, traceId: 'mock-' + uuid().slice(0, 8) }
}

/** 解析 URL：去掉 baseURL (/api)，返回纯 path */
function parsePath(url: string): string {
  return url.replace(/^\/api/, '').replace(/\?.*$/, '')
}

/** 解析 query */
function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf('?')
  if (idx < 0) return {}
  const query: Record<string, string> = {}
  url.slice(idx + 1).split('&').forEach((kv) => {
    const [k, v] = kv.split('=')
    if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
  })
  return query
}

/** 匹配路径参数：pattern 用 :xxx 占位 */
function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i])
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

/* ============== 内存态（运行时可变） ============== */
const seatsBySession = new Map<number, ReturnType<typeof generateSeats>>()
const lockedSeats = new Map<number, { seatId: number; userId: number; expireAt: number }>()

function getSeats(sessionId: number) {
  if (!seatsBySession.has(sessionId)) {
    seatsBySession.set(sessionId, generateSeats(sessionId))
  }
  return seatsBySession.get(sessionId)!
}

/* ============== 状态联动辅助函数 ==============
 * 演出 ↔ 场次状态双向联动：
 * - 改演出状态 -> 同步该演出下所有场次的 status（未上架->未开售、售罄->售罄、结束->已结束）
 * - 改场次状态 -> 根据该演出所有场次的最新状态推导演出状态（全售罄/全结束 等）
 * - 下单/支付 -> 扣减票档库存，刷新场次 remainingCount，剩余为 0 自动售罄
 */
function deriveSessionStatusFromEvent(eventStatus: EventStatus): SessionStatus {
  switch (eventStatus) {
    case 'DRAFT': return 'NOT_STARTED'   // 未上架 -> 未开售（可预约）
    case 'ON_SALE': return 'ON_SALE'     // 在售 -> 在售
    case 'SOLD_OUT': return 'SOLD_OUT'   // 售罄 -> 售罄
    case 'END': return 'ENDED'           // 已结束 -> 已结束
    default: return 'NOT_STARTED'
  }
}

function deriveEventStatusFromSessions(eventId: number): EventStatus {
  const sessions = mockSessions.filter((s) => s.eventId === eventId)
  if (!sessions.length) return 'DRAFT'
  if (sessions.every((s) => s.status === 'ENDED')) return 'END'
  // 全部售罄或已结束 -> 演出卖罄
  if (sessions.every((s) => s.status === 'SOLD_OUT' || s.status === 'ENDED')) return 'SOLD_OUT'
  // 任一在售 -> 演出在售
  if (sessions.some((s) => s.status === 'ON_SALE')) return 'ON_SALE'
  // 全部未开售 -> 演出未上架
  return 'DRAFT'
}

/** 同步场次状态到其票档库存（售罄清零 / 在售回算） */
function syncCategoriesBySessionStatus(sessionId: number, status: SessionStatus) {
  if (status === 'SOLD_OUT') {
    mockCategories
      .filter((c) => c.sessionId === sessionId)
      .forEach((c) => {
        c.soldQuantity = c.totalQuantity
        c.remainingQuantity = 0
      })
  } else if (status === 'ON_SALE') {
    mockCategories
      .filter((c) => c.sessionId === sessionId)
      .forEach((c) => {
        c.remainingQuantity = Math.max(0, c.totalQuantity - c.soldQuantity)
      })
  }
}

/** 开售时间已到但状态仍为未开售 -> 自动转为在售（PRD 7.1 倒计时到点联动） */
function maybeStartSale(s: (typeof mockSessions)[number]) {
  if (s.status !== 'NOT_STARTED') return
  if (!s.saleStartTime) return
  const startMs = new Date(s.saleStartTime).getTime()
  if (Number.isNaN(startMs)) return
  if (Date.now() >= startMs) {
    s.status = 'ON_SALE'
    syncCategoriesBySessionStatus(s.id, 'ON_SALE')
    refreshSessionAvailability(s.id)
    // 联动演出状态
    const event = mockEvents.find((e) => e.id === s.eventId)
    if (event) event.status = deriveEventStatusFromSessions(event.id)
  }
}

/** 刷新场次剩余票数；在售且余票为 0 -> 售罄并联动演出状态 */
function refreshSessionAvailability(sessionId: number) {
  const s = mockSessions.find((x) => x.id === sessionId)
  if (!s) return
  const cats = mockCategories.filter((c) => c.sessionId === sessionId)
  const totalRemain = cats.reduce((sum, c) => sum + Math.max(0, c.remainingQuantity ?? 0), 0)
  s.remainingCount = totalRemain
  if (totalRemain === 0 && s.status === 'ON_SALE') {
    s.status = 'SOLD_OUT'
    syncCategoriesBySessionStatus(sessionId, 'SOLD_OUT')
    // 联动演出状态
    const event = mockEvents.find((e) => e.id === s.eventId)
    if (event) event.status = deriveEventStatusFromSessions(event.id)
  }
}

/** 演出状态 -> 场次状态联动（改演出时调用） */
function cascadeEventToSessions(eventId: number, eventStatus: EventStatus) {
  const target = deriveSessionStatusFromEvent(eventStatus)
  mockSessions
    .filter((s) => s.eventId === eventId)
    .forEach((s) => {
      s.status = target
      syncCategoriesBySessionStatus(s.id, target)
      // 刷新场次剩余票数（售罄清零后 remainingCount 应为 0，在售应回算）
      refreshSessionAvailability(s.id)
    })
}

/** 为单个票档生成座位并追加到场次座位图（新建票档时调用） */
function generateSeatsForCategory(sessionId: number, category: TicketCategory) {
  const areas = getSeats(sessionId)
  // 查找已有座位中最大的行字母，新区域从下一个字母开始，避免行名重叠
  let maxLetterCode = 64 // '@'，即 A 的前一个
  for (const area of areas) {
    for (const seat of area.seats) {
      const code = seat.row.charCodeAt(0)
      if (code > maxLetterCode) maxLetterCode = code
    }
  }
  let seatIdBase = Date.now() % 1000000
  const seats: Seat[] = []
  const rowNames: string[] = []
  for (let r = 0; r < 3; r++) {
    const row = String.fromCharCode(maxLetterCode + 1 + r)
    rowNames.push(row)
    for (let col = 1; col <= 12; col++) {
      seatIdBase++
      seats.push({
        id: seatIdBase,
        row,
        col,
        area: category.name,
        status: SeatStatus.AVAILABLE,
        categoryId: category.id,
        price: category.price
      })
    }
  }
  areas.push({ area: category.name, seats, rows: rowNames })
}

/** 移除票档对应的座位区域（删除票档时调用） */
function removeSeatsForCategory(sessionId: number, categoryId: number) {
  if (!seatsBySession.has(sessionId)) return
  const areas = seatsBySession.get(sessionId)!
  const filtered = areas.filter((a) => !a.seats.some((s) => s.categoryId === categoryId))
  seatsBySession.set(sessionId, filtered)
}

/** 同步票档变更到座位：更新价格、区域名（编辑票档时调用） */
function syncSeatsByCategory(sessionId: number, category: TicketCategory) {
  if (!seatsBySession.has(sessionId)) return
  const areas = seatsBySession.get(sessionId)!
  for (const area of areas) {
    let renamed = false
    for (const seat of area.seats) {
      if (seat.categoryId === category.id) {
        // 用新对象替换触发响应式
        area.seats[area.seats.indexOf(seat)] = {
          ...seat,
          price: category.price,
          area: category.name
        }
        if (!renamed) {
          area.area = category.name
          renamed = true
        }
      }
    }
  }
}

/** 回补订单库存 + 释放座位（取消/退款/强制取消时复用） */
function restoreOrderStock(orderNo: string) {
  const o = mockOrders.find((x) => x.orderNo === orderNo)
  if (!o) return
  const allSeats = Array.from(seatsBySession.values()).flatMap((areas) =>
    areas.flatMap((a) => a.seats)
  )
  for (const item of o.items) {
    const cat = mockCategories.find((c) => c.id === item.ticketCategoryId)
    if (cat) {
      cat.remainingQuantity += item.quantity
      cat.soldQuantity = Math.max(0, cat.soldQuantity - item.quantity)
    }
    if (item.seatIds) {
      for (const seatId of item.seatIds) {
        const seat = allSeats.find((s) => s && s.id === seatId)
        if (seat && (seat.status === 'LOCKED' || seat.status === 'SOLD')) {
          seat.status = SeatStatus.AVAILABLE
          seat.lockUserId = undefined
          seat.lockExpireAt = undefined
          lockedSeats.delete(seatId)
        }
      }
    }
  }
  refreshSessionAvailability(o.sessionId)
}

/** 管理员修改单个座位状态时同步票档库存 */
function syncSeatStockChange(seat: Seat, oldStatus: Seat['status'], newStatus: Seat['status']) {
  if (seat.categoryId == null) return
  const cat = mockCategories.find((c) => c.id === seat.categoryId)
  if (!cat) return
  // SOLD 入: 扣库存；SOLD 出: 回补
  if (newStatus === 'SOLD' && oldStatus !== 'SOLD') {
    cat.soldQuantity += 1
    cat.remainingQuantity = Math.max(0, cat.remainingQuantity - 1)
  } else if (newStatus !== 'SOLD' && oldStatus === 'SOLD') {
    cat.soldQuantity = Math.max(0, cat.soldQuantity - 1)
    cat.remainingQuantity += 1
  }
  // LOCKED -> AVAILABLE 释放锁
  if (newStatus === 'AVAILABLE' && oldStatus === 'LOCKED') {
    lockedSeats.delete(seat.id)
  }
  refreshSessionAvailability(cat.sessionId)
}

/* ============== 路由表 ============== */
type Handler = (params: {
  path: string
  query: Record<string, string>
  body: unknown
  method: string
  headers: Record<string, string>
}) => unknown

interface Route {
  method: string
  pattern: string
  handler: Handler
}

const routes: Route[] = [
  /* ===== Auth ===== */
  {
    method: 'POST', pattern: '/auth/login',
    handler: ({ body }) => {
      const { username, password } = body as { username: string; password: string }
      const u = mockUsers.find((x) => x.username === username && x.password === password)
      if (!u) return fail(40101, '用户名或密码错误')
      const { password: _pw, ...userInfo } = u
      return ok({ token: 'mock-token-' + u.id, expiresIn: 7200, user: userInfo })
    }
  },
  {
    method: 'POST', pattern: '/auth/register',
    handler: ({ body }) => {
      const { username, password } = body as { username: string; password: string }
      if (mockUsers.some((u) => u.username === username)) return fail(40905, '用户名已存在')
      const id = mockUsers.length + 1
      const newUser = { id, username, password, nickname: username, role: 'USER' as const, phone: '' }
      mockUsers.push(newUser)
      const { password: _pw, ...userInfo } = newUser
      return ok({ token: 'mock-token-' + id, expiresIn: 7200, user: userInfo })
    }
  },
  {
    method: 'GET', pattern: '/auth/profile',
    handler: ({ headers }) => {
      const uid = Number((headers.Authorization || '').replace('Bearer mock-token-', ''))
      const u = mockUsers.find((x) => x.id === uid)
      if (!u) return fail(40102, '登录已失效')
      const { password: _pw, ...userInfo } = u
      return ok(userInfo)
    }
  },
  {
    method: 'PUT', pattern: '/auth/profile',
    handler: ({ body, headers }) => {
      const uid = Number((headers.Authorization || '').replace('Bearer mock-token-', ''))
      const u = mockUsers.find((x) => x.id === uid)
      if (!u) return fail(40102, '登录已失效')
      Object.assign(u, body as Record<string, unknown>)
      const { password: _pw, ...userInfo } = u
      return ok(userInfo)
    }
  },
  {
    method: 'POST', pattern: '/auth/logout',
    handler: () => ok(null)
  },

  /* ===== Event ===== */
  {
    method: 'GET', pattern: '/events',
    handler: ({ query }) => {
      let list = [...mockEvents]
      if (query.keyword) list = list.filter((e) => e.title.includes(query.keyword))
      if (query.city) list = list.filter((e) => e.city === query.city)
      if (query.category) list = list.filter((e) => e.category === query.category)
      if (query.status) list = list.filter((e) => e.status === query.status)
      // 价格区间筛选（区间重叠：event 价格区间与查询区间有交集即命中）
      const minP = query.minPrice ? Number(query.minPrice) : undefined
      const maxP = query.maxPrice ? Number(query.maxPrice) : undefined
      if (minP != null || maxP != null) {
        list = list.filter((e) => {
          const eMin = e.minPrice ?? 0
          const eMax = e.maxPrice ?? eMin
          const qMin = minP ?? 0
          const qMax = maxP ?? Number.MAX_SAFE_INTEGER
          // 区间重叠判定
          return eMax >= qMin && eMin <= qMax
        })
      }
      // 排序（PRD 8.3）
      const sort = query.sort
      if (sort === 'price_asc') {
        list.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0))
      } else if (sort === 'price_desc') {
        list.sort((a, b) => (b.maxPrice ?? 0) - (a.maxPrice ?? 0))
      } else if (sort === 'time_desc') {
        list.sort((a, b) => String(b.showTime ?? '').localeCompare(String(a.showTime ?? '')))
      }
      // heat_desc / 默认保持原序（热度优先）
      const page = Number(query.page) || 1
      const size = Number(query.size) || 12
      const start = (page - 1) * size
      return ok({ records: list.slice(start, start + size), total: list.length, page, size })
    }
  },
  {
    method: 'GET', pattern: '/events/:id',
    handler: ({ path }) => {
      const id = Number(matchPath('/events/:id', path)!.id)
      const e = mockEvents.find((x) => x.id === id)
      if (!e) return fail(40201, '演出不存在或已下架')
      return ok(e)
    }
  },

  /* ===== Session ===== */
  {
    method: 'GET', pattern: '/events/:id/sessions',
    handler: ({ path }) => {
      const eventId = Number(matchPath('/events/:id/sessions', path)!.id)
      return ok(mockSessions.filter((s) => s.eventId === eventId))
    }
  },
  {
    method: 'GET', pattern: '/sessions/:id',
    handler: ({ path }) => {
      const id = Number(matchPath('/sessions/:id', path)!.id)
      const s = mockSessions.find((x) => x.id === id)
      if (!s) return fail(40202, '场次不存在')
      // 开售时间已到但状态仍为未开售 -> 自动转为在售（PRD 7.1 倒计时到点联动）
      maybeStartSale(s)
      return ok(s)
    }
  },
  {
    method: 'GET', pattern: '/sessions/:id/categories',
    handler: ({ path }) => {
      const id = Number(matchPath('/sessions/:id/categories', path)!.id)
      return ok(mockCategories.filter((c) => c.sessionId === id))
    }
  },

  /* ===== Seat ===== */
  {
    method: 'GET', pattern: '/sessions/:id/seats',
    handler: ({ path }) => {
      const id = Number(matchPath('/sessions/:id/seats', path)!.id)
      return ok(getSeats(id))
    }
  },
  {
    method: 'GET', pattern: '/sessions/:id/seats/mine',
    handler: ({ path, headers }) => {
      const id = Number(matchPath('/sessions/:id/seats/mine', path)!.id)
      const uid = Number((headers.Authorization || '').replace('Bearer mock-token-', ''))
      const areas = getSeats(id)
      const mine = areas.flatMap((a) => a.seats).filter((s) => s.lockUserId === uid)
      return ok(mine)
    }
  },
  {
    method: 'POST', pattern: '/seats/lock',
    handler: ({ body, headers }) => {
      const { sessionId, seatIds } = body as SeatLockRequest
      // 从 Authorization 头解析当前用户 ID（与 /sessions/:id/seats/mine 保持一致）
      const uid = Number((headers.Authorization || '').replace('Bearer mock-token-', '')) || 2
      const areas = getSeats(sessionId)
      const allSeats = areas.flatMap((a) => a.seats)
      const now = Date.now()
      const expireAt = now + 15 * 60 * 1000
      const results = seatIds.map((seatId) => {
        const seat = allSeats.find((s) => s.id === seatId)
        if (!seat || seat.status !== 'AVAILABLE') {
          return { seatId, success: false, failReason: seat?.status === 'SOLD' ? 'SEAT_TAKEN' : 'NOT_AVAILABLE' }
        }
        seat.status = SeatStatus.LOCKED
        seat.lockUserId = uid
        seat.lockExpireAt = new Date(expireAt).toISOString()
        lockedSeats.set(seatId, { seatId, userId: uid, expireAt })
        return { seatId, success: true }
      })
      return ok({ expireAt: formatDateTime(expireAt), results })
    }
  },
  {
    method: 'DELETE', pattern: '/seats/lock',
    handler: ({ body }) => {
      const { seatIds } = body as SeatLockRequest
      // seatsBySession 是 Map<number, SeatArea[]>，values() 迭代的是 SeatArea[]，
      // 需再 flatMap 一次取出所有 Seat，否则 a.seats 是 undefined
      const allSeats = Array.from(seatsBySession.values()).flatMap((areas) =>
        areas.flatMap((a) => a.seats)
      )
      for (const seatId of seatIds) {
        const seat = allSeats.find((s) => s && s.id === seatId)
        if (seat && seat.status === 'LOCKED') {
          seat.status = SeatStatus.AVAILABLE
          seat.lockUserId = undefined
          seat.lockExpireAt = undefined
          lockedSeats.delete(seatId)
        }
      }
      return ok(null)
    }
  },

  /* ===== Order ===== */
  {
    method: 'POST', pattern: '/orders',
    handler: ({ body, headers }) => {
      const data = body as CreateOrderRequest
      const session = mockSessions.find((s) => s.id === data.sessionId)
      const event = mockEvents.find((e) => e.id === session?.eventId)
      // 解析下单用户，写入 username 便于管理端筛选/展示
      const uid = Number((headers.Authorization || '').replace('Bearer mock-token-', '')) || 2
      const orderUser = mockUsers.find((u) => u.id === uid)
      const orderNo = 'ST' + Date.now().toString().slice(-12)
      // 计算金额（按票档价格 * 数量）
      let payAmount = 0
      for (const item of data.items) {
        const cat = mockCategories.find((c) => c.id === item.ticketCategoryId)
        payAmount += (cat?.price ?? 0) * item.quantity
      }
      const expireAt = Date.now() + 15 * 60 * 1000
      const newOrder = {
        orderNo,
        sessionId: data.sessionId,
        eventTitle: event?.title ?? '',
        showTime: session?.showTime ?? '',
        venue: session?.venue ?? '',
        payAmount,
        status: 'UNPAID' as OrderStatus,
        username: orderUser?.username ?? 'user',
        expireTime: formatDateTime(expireAt),
        createTime: formatDateTime(Date.now()),
        orderType: data.orderType,
        items: data.items.map((it) => {
          const cat = mockCategories.find((c) => c.id === it.ticketCategoryId)
          return {
            ticketCategoryId: it.ticketCategoryId,
            categoryName: cat?.name ?? '',
            price: cat?.price ?? 0,
            quantity: it.quantity,
            seatIds: it.seatIds,
            seatLabels: it.seatIds?.map((id) => {
              // seatsBySession.values() 迭代 SeatArea[]，需双层 flatMap 取出 Seat
              const s = Array.from(seatsBySession.values())
                .flatMap((areas) => areas.flatMap((a) => a.seats))
                .find((x) => x && x.id === id)
              return s ? `${s.row}${s.col}` : `#${id}`
            })
          }
        })
      }
      // 扣减票档库存（预扣），刷新场次剩余票数 + 售罄联动
      for (const item of data.items) {
        const cat = mockCategories.find((c) => c.id === item.ticketCategoryId)
        if (cat) {
          cat.remainingQuantity = Math.max(0, cat.remainingQuantity - item.quantity)
          cat.soldQuantity += item.quantity
        }
      }
      refreshSessionAvailability(data.sessionId)
      mockOrders.unshift(newOrder)
      return ok({ orderNo, payAmount, status: 'UNPAID', expireTime: newOrder.expireTime })
    }
  },
  {
    method: 'GET', pattern: '/orders',
    handler: ({ query }) => {
      let list = [...mockOrders]
      if (query.status) list = list.filter((o) => o.status === query.status)
      const page = Number(query.page) || 1
      const size = Number(query.size) || 10
      const start = (page - 1) * size
      return ok({ records: list.slice(start, start + size), total: list.length, page, size })
    }
  },
  {
    method: 'GET', pattern: '/orders/:orderNo',
    handler: ({ path }) => {
      const orderNo = matchPath('/orders/:orderNo', path)!.orderNo
      const detail = getOrderDetail(orderNo)
      if (!detail) return fail(40904, '订单不存在')
      return ok(detail)
    }
  },
  {
    method: 'POST', pattern: '/orders/:orderNo/cancel',
    handler: ({ path }) => {
      const orderNo = matchPath('/orders/:orderNo/cancel', path)!.orderNo
      const o = mockOrders.find((x) => x.orderNo === orderNo)
      if (!o) return fail(40904, '订单不存在')
      if (o.status !== 'UNPAID') return fail(40902, '订单状态不允许取消')
      o.status = OrderStatus.CANCELED
      // 取消未付款订单 -> 回补票档库存 + 释放锁定座位 + 刷新场次状态
      for (const item of o.items) {
        const cat = mockCategories.find((c) => c.id === item.ticketCategoryId)
        if (cat) {
          cat.remainingQuantity += item.quantity
          cat.soldQuantity = Math.max(0, cat.soldQuantity - item.quantity)
        }
        if (item.seatIds) {
          for (const seatId of item.seatIds) {
            const allSeats = Array.from(seatsBySession.values()).flatMap((areas) =>
              areas.flatMap((a) => a.seats)
            )
            const seat = allSeats.find((s) => s && s.id === seatId)
            if (seat && seat.status === 'LOCKED') {
              seat.status = SeatStatus.AVAILABLE
              seat.lockUserId = undefined
              seat.lockExpireAt = undefined
              lockedSeats.delete(seatId)
            }
          }
        }
      }
      refreshSessionAvailability(o.sessionId)
      return ok(null)
    }
  },
  {
    method: 'POST', pattern: '/orders/:orderNo/refund',
    handler: ({ path }) => {
      const orderNo = matchPath('/orders/:orderNo/refund', path)!.orderNo
      const o = mockOrders.find((x) => x.orderNo === orderNo)
      if (!o) return fail(40904, '订单不存在')
      if (o.status !== 'PAID') return fail(40902, '订单状态不允许退款')
      o.status = OrderStatus.REFUNDING
      return ok(null)
    }
  },

  /* ===== Payment ===== */
  {
    method: 'POST', pattern: '/pay/mock/notify',
    handler: ({ body }) => {
      const { orderNo } = body as PayMockRequest
      const o = mockOrders.find((x) => x.orderNo === orderNo)
      if (!o) return fail(40904, '订单不存在')
      if (o.status === 'PAID') return ok({ payNo: 'PAY' + Date.now(), orderStatus: 'PAID', duplicated: true })
      if (o.status !== 'UNPAID') return fail(40902, '订单状态不允许支付')
      o.status = OrderStatus.PAID
      // 支付成功 -> 标记订单内座位为已售（SOLD），释放锁定态
      for (const item of o.items) {
        if (item.seatIds) {
          for (const seatId of item.seatIds) {
            const allSeats = Array.from(seatsBySession.values()).flatMap((areas) =>
              areas.flatMap((a) => a.seats)
            )
            const seat = allSeats.find((s) => s && s.id === seatId)
            if (seat && seat.status !== 'SOLD') {
              seat.status = SeatStatus.SOLD
              seat.lockUserId = undefined
              seat.lockExpireAt = undefined
              lockedSeats.delete(seatId)
            }
          }
        }
      }
      return ok({ payNo: 'PAY' + Date.now(), orderStatus: 'PAID', duplicated: false })
    }
  },

  /* ===== Reservation ===== */
  {
    method: 'POST', pattern: '/reservations',
    handler: ({ body }) => {
      const { sessionId, categoryId } = body as ReservationRequest
      const session = mockSessions.find((s) => s.id === sessionId)
      const event = mockEvents.find((e) => e.id === session?.eventId)
      const cat = mockCategories.find((c) => c.id === categoryId)
      const newRes = {
        id: mockReservations.length + 1,
        sessionId,
        categoryId,
        eventTitle: event?.title ?? '',
        showTime: session?.showTime ?? '',
        categoryName: cat?.name ?? '',
        status: 'PENDING' as const,
        createTime: formatDateTime(Date.now())
      }
      mockReservations.push(newRes)
      return ok(newRes)
    }
  },
  {
    method: 'GET', pattern: '/reservations',
    handler: ({ query }) => {
      const page = Number(query.page) || 1
      const size = Number(query.size) || 10
      const start = (page - 1) * size
      return ok({ records: mockReservations.slice(start, start + size), total: mockReservations.length, page, size })
    }
  },
  {
    method: 'DELETE', pattern: '/reservations/:id',
    handler: ({ path }) => {
      const id = Number(matchPath('/reservations/:id', path)!.id)
      const idx = mockReservations.findIndex((r) => r.id === id)
      if (idx >= 0) mockReservations.splice(idx, 1)
      return ok(null)
    }
  },

  /* ===== Admin Event ===== */
  {
    method: 'GET', pattern: '/admin/events',
    handler: ({ query }) => {
      let list = [...mockEvents]
      if (query.keyword) list = list.filter((e) => e.title.includes(query.keyword))
      if (query.city) list = list.filter((e) => e.city === query.city)
      if (query.category) list = list.filter((e) => e.category === query.category)
      if (query.status) list = list.filter((e) => e.status === query.status)
      const page = Number(query.page) || 1
      const size = Number(query.size) || 10
      const start = (page - 1) * size
      return ok({ records: list.slice(start, start + size), total: list.length, page, size })
    }
  },
  {
    method: 'GET', pattern: '/admin/events/:id',
    handler: ({ path }) => {
      const id = Number(matchPath('/admin/events/:id', path)!.id)
      const e = mockEvents.find((x) => x.id === id)
      if (!e) return fail(40201, '演出不存在')
      return ok(e)
    }
  },
  {
    method: 'POST', pattern: '/admin/events',
    handler: ({ body }) => {
      const id = Math.max(...mockEvents.map((e) => e.id)) + 1
      const newEvent = { id, ...(body as object), status: 'DRAFT' as const } as (typeof mockEvents)[number]
      mockEvents.push(newEvent)
      return ok(newEvent)
    }
  },
  {
    method: 'PUT', pattern: '/admin/events/:id',
    handler: ({ path, body }) => {
      const id = Number(matchPath('/admin/events/:id', path)!.id)
      const e = mockEvents.find((x) => x.id === id)
      if (!e) return fail(40201, '演出不存在')
      const newStatus = (body as { status?: EventStatus }).status
      Object.assign(e, body)
      // 演出状态变化 -> 联动该演出下所有场次状态（未上架->未开售 等）
      if (newStatus) cascadeEventToSessions(id, newStatus)
      return ok(e)
    }
  },
  {
    method: 'PUT', pattern: '/admin/events/:id/status',
    handler: ({ path, body }) => {
      const id = Number(matchPath('/admin/events/:id/status', path)!.id)
      const e = mockEvents.find((x) => x.id === id)
      if (!e) return fail(40201, '演出不存在')
      e.status = (body as { status: typeof e.status }).status
      // 演出状态变化 -> 联动该演出下所有场次状态（未上架->未开售 等）
      cascadeEventToSessions(id, e.status)
      return ok(e)
    }
  },
  {
    method: 'DELETE', pattern: '/admin/events/:id',
    handler: ({ path }) => {
      const id = Number(matchPath('/admin/events/:id', path)!.id)
      const idx = mockEvents.findIndex((e) => e.id === id)
      if (idx >= 0) mockEvents.splice(idx, 1)
      // 级联删除：场次 + 票档 + 座位
      const sessionIds = mockSessions.filter((s) => s.eventId === id).map((s) => s.id)
      for (let i = mockSessions.length - 1; i >= 0; i--) {
        if (mockSessions[i].eventId === id) mockSessions.splice(i, 1)
      }
      for (const sid of sessionIds) {
        for (let i = mockCategories.length - 1; i >= 0; i--) {
          if (mockCategories[i].sessionId === sid) mockCategories.splice(i, 1)
        }
        seatsBySession.delete(sid)
      }
      return ok(null)
    }
  },

  /* ===== Admin Session ===== */
  {
    method: 'GET', pattern: '/admin/events/:eventId/sessions',
    handler: ({ path }) => {
      const eventId = Number(matchPath('/admin/events/:eventId/sessions', path)!.eventId)
      return ok(mockSessions.filter((s) => s.eventId === eventId))
    }
  },
  {
    method: 'POST', pattern: '/admin/events/:eventId/sessions',
    handler: ({ path, body }) => {
      const eventId = Number(matchPath('/admin/events/:eventId/sessions', path)!.eventId)
      const id = Math.max(...mockSessions.map((s) => s.id)) + 1
      const newSession = { id, eventId, ...(body as object), status: 'NOT_STARTED' as const } as (typeof mockSessions)[number]
      mockSessions.push(newSession)
      return ok(newSession)
    }
  },
  {
    method: 'PUT', pattern: '/admin/sessions/:id',
    handler: ({ path, body }) => {
      const id = Number(matchPath('/admin/sessions/:id', path)!.id)
      const s = mockSessions.find((x) => x.id === id)
      if (!s) return fail(40202, '场次不存在')
      const newStatus = (body as { status?: SessionStatus }).status
      Object.assign(s, body)
      // 场次状态变化 -> 同步票档库存（售罄清零 / 在售回算）+ 刷新剩余票数
      if (newStatus) {
        syncCategoriesBySessionStatus(id, newStatus)
        refreshSessionAvailability(id)
      }
      // 场次状态变化 -> 联动演出状态（全售罄->演出售罄、全结束->演出结束 等）
      if (newStatus) {
        const event = mockEvents.find((e) => e.id === s.eventId)
        if (event) event.status = deriveEventStatusFromSessions(event.id)
      }
      return ok(s)
    }
  },
  {
    method: 'DELETE', pattern: '/admin/sessions/:id',
    handler: ({ path }) => {
      const id = Number(matchPath('/admin/sessions/:id', path)!.id)
      const s = mockSessions.find((x) => x.id === id)
      const idx = mockSessions.findIndex((s) => s.id === id)
      if (idx >= 0) mockSessions.splice(idx, 1)
      // 级联删除：票档 + 座位
      for (let i = mockCategories.length - 1; i >= 0; i--) {
        if (mockCategories[i].sessionId === id) mockCategories.splice(i, 1)
      }
      seatsBySession.delete(id)
      // 刷新演出状态（场次删除后演出状态可能变化）
      if (s) {
        const event = mockEvents.find((e) => e.id === s.eventId)
        if (event) event.status = deriveEventStatusFromSessions(event.id)
      }
      return ok(null)
    }
  },

  /* ===== Admin Category ===== */
  {
    method: 'GET', pattern: '/admin/sessions/:id/categories',
    handler: ({ path }) => {
      const id = Number(matchPath('/admin/sessions/:id/categories', path)!.id)
      return ok(mockCategories.filter((c) => c.sessionId === id))
    }
  },
  {
    method: 'POST', pattern: '/admin/sessions/:id/categories',
    handler: ({ path, body }) => {
      const sessionId = Number(matchPath('/admin/sessions/:id/categories', path)!.id)
      const id = Math.max(...mockCategories.map((c) => c.id)) + 1
      const newCat = { id, sessionId, soldQuantity: 0, remainingQuantity: (body as { totalQuantity?: number }).totalQuantity ?? 100, ...(body as object) } as (typeof mockCategories)[number]
      mockCategories.push(newCat)
      // 新增票档 -> 自动生成对应区域的座位
      generateSeatsForCategory(sessionId, newCat)
      // 刷新场次剩余票数
      refreshSessionAvailability(sessionId)
      return ok(newCat)
    }
  },
  {
    method: 'PUT', pattern: '/admin/categories/:id',
    handler: ({ path, body }) => {
      const id = Number(matchPath('/admin/categories/:id', path)!.id)
      const c = mockCategories.find((x) => x.id === id)
      if (!c) return fail(40203, '票档不存在')
      Object.assign(c, body)
      // 票档总票数变化 -> 重算剩余量
      if (c.totalQuantity != null) {
        c.remainingQuantity = Math.max(0, c.totalQuantity - c.soldQuantity)
      }
      // 同步座位价格和区域名（改名/改价时座位跟着变）
      syncSeatsByCategory(c.sessionId, c)
      // 刷新场次剩余票数 + 售罄联动
      refreshSessionAvailability(c.sessionId)
      return ok(c)
    }
  },
  {
    method: 'DELETE', pattern: '/admin/categories/:id',
    handler: ({ path }) => {
      const id = Number(matchPath('/admin/categories/:id', path)!.id)
      const c = mockCategories.find((x) => x.id === id)
      const idx = mockCategories.findIndex((c) => c.id === id)
      if (idx >= 0) mockCategories.splice(idx, 1)
      // 删除票档 -> 移除对应座位区域 + 刷新场次剩余票数
      if (c) {
        removeSeatsForCategory(c.sessionId, id)
        refreshSessionAvailability(c.sessionId)
      }
      return ok(null)
    }
  },

  /* ===== Admin Seat ===== */
  {
    method: 'GET', pattern: '/admin/sessions/:id/seats',
    handler: ({ path }) => {
      const id = Number(matchPath('/admin/sessions/:id/seats', path)!.id)
      return ok(Array.from(getSeats(id).flatMap((a) => a.seats)))
    }
  },
  {
    method: 'POST', pattern: '/admin/sessions/:id/seats/batch',
    handler: ({ path, body }) => {
      const id = Number(matchPath('/admin/sessions/:id/seats/batch', path)!.id)
      const { area, rows, cols, categoryId } = body as { area: string; rows: string[]; cols: number; categoryId?: number }
      // 校验 categoryId 必须对应真实票档，自动补全 area 名称和 price
      const cat = categoryId != null ? mockCategories.find((c) => c.id === categoryId) : null
      if (!cat) return fail(40203, '请选择有效的票档，座位必须归属某个票档')
      const realArea = area || cat.name
      const areas = getSeats(id)
      const existArea = areas.find((a) => a.area === realArea)
      const newSeats: Seat[] = []
      let idBase = Date.now() % 1000000
      for (const row of rows) {
        for (let col = 1; col <= cols; col++) {
          idBase++
          newSeats.push({
            id: idBase, row, col,
            area: realArea,
            status: SeatStatus.AVAILABLE,
            categoryId: cat.id,
            price: cat.price
          })
        }
      }
      if (existArea) existArea.seats.push(...newSeats)
      else areas.push({ area: realArea, seats: newSeats, rows: [...rows] })
      return ok(newSeats)
    }
  },
  {
    method: 'PUT', pattern: '/admin/seats/:id',
    handler: ({ path, body }) => {
      const id = Number(matchPath('/admin/seats/:id', path)!.id)
      const all = Array.from(seatsBySession.values()).flatMap((areas) =>
        areas.flatMap((a) => a.seats)
      )
      const seat = all.find((s) => s && s.id === id)
      if (!seat) return fail(40201, '座位不存在')
      const oldStatus = seat.status
      Object.assign(seat, body)
      const newStatus = seat.status
      // 状态变化 -> 同步票档库存（SOLD 扣库存、回 AVAILABLE 补库存）
      if (newStatus !== oldStatus) {
        syncSeatStockChange(seat, oldStatus, newStatus)
      }
      return ok(seat)
    }
  },

  /* ===== Admin Order ===== */
  {
    method: 'GET', pattern: '/admin/orders',
    handler: ({ query }) => {
      let list = [...mockOrders]
      if (query.status) list = list.filter((o) => o.status === query.status)
      if (query.orderNo) list = list.filter((o) => o.orderNo.includes(query.orderNo))
      if (query.username) {
        list = list.filter((o) => (o.username ?? '').includes(query.username))
      }
      // 时间区间筛选（createTime 落在 [startTime, endTime]）
      const startMs = query.startTime ? new Date(query.startTime).getTime() : NaN
      const endMs = query.endTime ? new Date(query.endTime).getTime() : NaN
      if (!Number.isNaN(startMs) || !Number.isNaN(endMs)) {
        list = list.filter((o) => {
          const t = new Date(o.createTime).getTime()
          if (Number.isNaN(t)) return false
          if (!Number.isNaN(startMs) && t < startMs) return false
          if (!Number.isNaN(endMs) && t > endMs) return false
          return true
        })
      }
      const page = Number(query.page) || 1
      const size = Number(query.size) || 10
      const start = (page - 1) * size
      return ok({ records: list.slice(start, start + size), total: list.length, page, size })
    }
  },
  {
    method: 'GET', pattern: '/admin/orders/:orderNo',
    handler: ({ path }) => {
      const orderNo = matchPath('/admin/orders/:orderNo', path)!.orderNo
      const detail = getOrderDetail(orderNo)
      if (!detail) return fail(40904, '订单不存在')
      return ok(detail)
    }
  },
  {
    method: 'POST', pattern: '/admin/orders/:orderNo/force-cancel',
    handler: ({ path }) => {
      const orderNo = matchPath('/admin/orders/:orderNo/force-cancel', path)!.orderNo
      const o = mockOrders.find((x) => x.orderNo === orderNo)
      if (!o) return fail(40904, '订单不存在')
      // 强制取消 -> 回补库存 + 释放座位（与用户取消一致）
      restoreOrderStock(orderNo)
      o.status = OrderStatus.CANCELED
      return ok(null)
    }
  },
  {
    method: 'POST', pattern: '/admin/orders/:orderNo/refund/approval',
    handler: ({ path, body }) => {
      const orderNo = matchPath('/admin/orders/:orderNo/refund/approval', path)!.orderNo
      const { approved } = body as { approved: boolean }
      const o = mockOrders.find((x) => x.orderNo === orderNo)
      if (!o) return fail(40904, '订单不存在')
      if (approved) {
        // 退款通过 -> 回补库存 + 释放已售座位
        restoreOrderStock(orderNo)
        o.status = OrderStatus.REFUNDED
      } else {
        o.status = OrderStatus.PAID
      }
      return ok(null)
    }
  }
]

/* ============== axios adapter ============== */
export const mockAdapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
  return new Promise((resolve) => {
    const method = (config.method ?? 'GET').toUpperCase()
    const url = config.url ?? ''
    const path = parsePath(url)
    // query 同时从 URL 字符串和 config.params 合并，确保参数一定能读到
    const query = { ...parseQuery(url) }
    const params = (config as { params?: Record<string, unknown> }).params
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          query[k] = String(v)
        }
      }
    }
    const headers = config.headers as Record<string, string>

    // 解析 body
    let body: unknown = null
    if (config.data) {
      try {
        body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
      } catch {
        body = config.data
      }
    }

    // 匹配路由
    let matched: { route: Route; params: Record<string, string> } | null = null
    for (const route of routes) {
      if (route.method !== method) continue
      const params = matchPath(route.pattern, path)
      if (params) {
        matched = { route, params }
        break
      }
    }

    // 模拟 300ms 网络延迟
    setTimeout(() => {
      let responseData: unknown
      let status = 200

      if (!matched) {
        responseData = fail(404, `[MOCK] 接口未匹配: ${method} ${path}`)
        status = 404
      } else {
        try {
          responseData = matched.route.handler({ path, query, body, method, headers })
          // 如果是 fail 对象（code !== 0），HTTP 状态按错误码分层
          if (responseData && typeof responseData === 'object' && (responseData as { code: number }).code !== 0) {
            const code = (responseData as { code: number }).code
            if (code >= 50300) status = 503
            else if (code >= 42900) status = 429
            else if (code >= 42300) status = 423
            else if (code >= 40900) status = 409
            else if (code >= 40200) status = 422
            else if (code >= 40100) status = 401
          }
        } catch (e) {
          responseData = fail(500, `[MOCK] 处理器异常: ${(e as Error).message}`)
          status = 500
        }
      }

      resolve({
        data: responseData,
        status,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
        request: {}
      })
    }, 300)
  })
}

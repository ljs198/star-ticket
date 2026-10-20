/**
 * Mock 数据（src/mock/data.ts）
 *
 * 用于前端独立测试，无需启动后端。
 * 知识点：
 * 1. 集中维护所有 mock 数据，结构与 api/types.ts 一致
 * 2. 金额单位：分（与后端一致）
 * 3. 日期格式：yyyy-MM-dd HH:mm:ss（东八区）
 * 4. 枚举大写下划线
 */
import type { EventItem, SessionItem, TicketCategory, Seat, OrderListItem, OrderDetail, ReservationItem, UserInfo, SeatArea } from '@/api/types'
import { OrderStatus } from '@/utils/order-status'
import { SeatStatus } from '@/utils/seat-status'

/* ============== 用户 ============== */
export const mockUsers: Array<UserInfo & { password: string }> = [
  { id: 1, username: 'admin', password: '123456', nickname: '管理员', role: 'ADMIN', phone: '13800000001' },
  { id: 2, username: 'user', password: '123456', nickname: '普通用户', role: 'USER', phone: '13800000002' }
]

/* ============== 演出 ============== */
export const mockEvents: EventItem[] = [
  {
    id: 1,
    title: '周杰伦「嘉年华」世界巡回演唱会·北京站',
    poster: 'https://picsum.photos/seed/zhoujielun/400/533',
    venue: '国家体育场（鸟巢）',
    city: '北京',
    category: '演唱会',
    status: 'ON_SALE',
    showTime: '2026-10-15 19:30:00',
    saleStartTime: '2026-09-01 10:00:00',
    saleEndTime: '2026-10-15 18:00:00',
    minPrice: 88000,
    maxPrice: 288000,
    description: '周杰伦2026嘉年华世界巡回演唱会北京站，经典曲目全新编曲，震撼舞美不容错过。'
  },
  {
    id: 2,
    title: '五月天「好好好想见到你」演唱会·上海站',
    poster: 'https://picsum.photos/seed/wuyuetian/400/533',
    venue: '上海体育场',
    city: '上海',
    category: '演唱会',
    status: 'ON_SALE',
    showTime: '2026-11-08 19:00:00',
    saleStartTime: '2026-09-10 10:00:00',
    saleEndTime: '2026-11-08 17:00:00',
    minPrice: 68000,
    maxPrice: 188000,
    description: '五月天2026全新巡演，摇滚与温情交织，与你不见不散。'
  },
  {
    id: 3,
    title: '话剧《如梦之梦》· 广州站',
    poster: 'https://picsum.photos/seed/rumeng/400/533',
    venue: '广州大剧院',
    city: '广州',
    category: '话剧',
    status: 'ON_SALE',
    showTime: '2026-10-20 19:30:00',
    saleStartTime: '2026-09-05 10:00:00',
    saleEndTime: '2026-10-20 18:00:00',
    minPrice: 38000,
    maxPrice: 128000,
    description: '赖声川导演经典八小时史诗巨作，环形剧场沉浸式体验。'
  },
  {
    id: 4,
    title: '2026 CBA 总决赛·深圳站',
    poster: 'https://picsum.photos/seed/cba/400/533',
    venue: '深圳大运中心体育馆',
    city: '深圳',
    category: '体育赛事',
    status: 'SOLD_OUT',
    showTime: '2026-05-20 19:35:00',
    saleStartTime: '2026-04-01 10:00:00',
    saleEndTime: '2026-05-20 18:00:00',
    minPrice: 28000,
    maxPrice: 128000,
    description: 'CBA总决赛巅峰对决，见证冠军诞生。'
  },
  {
    id: 5,
    title: '维也纳新年音乐会·北京站',
    poster: 'https://picsum.photos/seed/weiyena/400/533',
    venue: '国家大剧院',
    city: '北京',
    category: '音乐会',
    status: 'END',
    showTime: '2026-01-01 19:30:00',
    saleStartTime: '2025-11-01 10:00:00',
    saleEndTime: '2026-01-01 18:00:00',
    minPrice: 58000,
    maxPrice: 168000,
    description: '维也纳爱乐乐团倾情演奏，经典施特劳斯家族作品。'
  },
  {
    id: 6,
    title: '林俊杰「JJ20」世界巡回演唱会·成都站',
    poster: 'https://picsum.photos/seed/linjunjie/400/533',
    venue: '成都东安湖体育公园',
    city: '成都',
    category: '演唱会',
    status: 'ON_SALE',
    showTime: '2026-12-06 19:30:00',
    saleStartTime: '2026-10-01 10:00:00',
    saleEndTime: '2026-12-06 18:00:00',
    minPrice: 58000,
    maxPrice: 198000,
    description: '林俊杰出道20周年纪念巡演，金曲串烧回忆杀。'
  }
]

/* ============== 场次 ============== */
export const mockSessions: SessionItem[] = [
  // 周杰伦北京站（3场：2场在售 + 1场未开售，便于测试预约功能）
  { id: 101, eventId: 1, showTime: '2026-10-15 19:30:00', venue: '国家体育场（鸟巢）', status: 'ON_SALE', saleStartTime: '2026-09-01 10:00:00', saleEndTime: '2026-10-15 18:00:00', remainingCount: 500, minPrice: 88000 },
  { id: 102, eventId: 1, showTime: '2026-10-16 19:30:00', venue: '国家体育场（鸟巢）', status: 'ON_SALE', saleStartTime: '2026-09-01 10:00:00', saleEndTime: '2026-10-16 18:00:00', remainingCount: 300, minPrice: 88000 },
  { id: 103, eventId: 1, showTime: '2026-10-17 19:30:00', venue: '国家体育场（鸟巢）', status: 'NOT_STARTED', saleStartTime: '2026-10-01 10:00:00', saleEndTime: '2026-10-17 18:00:00', remainingCount: 400, minPrice: 88000 },
  // 五月天上海站
  { id: 201, eventId: 2, showTime: '2026-11-08 19:00:00', venue: '上海体育场', status: 'ON_SALE', saleStartTime: '2026-09-10 10:00:00', saleEndTime: '2026-11-08 17:00:00', remainingCount: 800, minPrice: 68000 },
  // 话剧如梦之梦
  { id: 301, eventId: 3, showTime: '2026-10-20 14:00:00', venue: '广州大剧院', status: 'ON_SALE', saleStartTime: '2026-09-05 10:00:00', saleEndTime: '2026-10-20 13:00:00', remainingCount: 200, minPrice: 38000 },
  { id: 302, eventId: 3, showTime: '2026-10-20 19:30:00', venue: '广州大剧院', status: 'ON_SALE', saleStartTime: '2026-09-05 10:00:00', saleEndTime: '2026-10-20 18:00:00', remainingCount: 150, minPrice: 38000 },
  // CBA
  { id: 401, eventId: 4, showTime: '2026-05-20 19:35:00', venue: '深圳大运中心体育馆', status: 'SOLD_OUT', saleStartTime: '2026-04-01 10:00:00', saleEndTime: '2026-05-20 18:00:00', remainingCount: 0, minPrice: 28000 }
]

/* ============== 票档 ============== */
export const mockCategories: TicketCategory[] = [
  // 周杰伦北京站
  { id: 1001, sessionId: 101, name: '内场VIP', price: 288000, color: '#E8463A', totalQuantity: 200, soldQuantity: 50, remainingQuantity: 150, limitPerUser: 4, description: '内场前排VIP区' },
  { id: 1002, sessionId: 101, name: '内场A区', price: 188000, color: '#EFAA17', totalQuantity: 500, soldQuantity: 120, remainingQuantity: 380, limitPerUser: 4 },
  { id: 1003, sessionId: 101, name: '看台B区', price: 128000, color: '#1DC981', totalQuantity: 1000, soldQuantity: 300, remainingQuantity: 700, limitPerUser: 4 },
  { id: 1004, sessionId: 101, name: '看台C区', price: 88000, color: '#22A5F7', totalQuantity: 1500, soldQuantity: 200, remainingQuantity: 1300, limitPerUser: 6 },
  // 周杰伦北京站（第3场，未开售，可预约）
  { id: 1031, sessionId: 103, name: '内场VIP', price: 288000, color: '#E8463A', totalQuantity: 200, soldQuantity: 0, remainingQuantity: 200, limitPerUser: 4, description: '内场前排VIP区' },
  { id: 1032, sessionId: 103, name: '内场A区', price: 188000, color: '#EFAA17', totalQuantity: 500, soldQuantity: 0, remainingQuantity: 500, limitPerUser: 4 },
  { id: 1033, sessionId: 103, name: '看台B区', price: 128000, color: '#1DC981', totalQuantity: 1000, soldQuantity: 0, remainingQuantity: 1000, limitPerUser: 4 },
  // 五月天
  { id: 2001, sessionId: 201, name: '内场VIP', price: 188000, color: '#E8463A', totalQuantity: 300, soldQuantity: 80, remainingQuantity: 220, limitPerUser: 4 },
  { id: 2002, sessionId: 201, name: '看台A区', price: 108000, color: '#1DC981', totalQuantity: 800, soldQuantity: 200, remainingQuantity: 600, limitPerUser: 4 },
  { id: 2003, sessionId: 201, name: '看台B区', price: 68000, color: '#22A5F7', totalQuantity: 1200, soldQuantity: 100, remainingQuantity: 1100, limitPerUser: 6 },
  // 话剧如梦之梦
  { id: 3001, sessionId: 301, name: '莲花池', price: 128000, color: '#E8463A', totalQuantity: 100, soldQuantity: 30, remainingQuantity: 70, limitPerUser: 2 },
  { id: 3002, sessionId: 301, name: '一层', price: 88000, color: '#1DC981', totalQuantity: 300, soldQuantity: 80, remainingQuantity: 220, limitPerUser: 4 },
  { id: 3003, sessionId: 301, name: '二层', price: 38000, color: '#22A5F7', totalQuantity: 400, soldQuantity: 50, remainingQuantity: 350, limitPerUser: 6 }
]

/* ============== 座位（按场次生成） ============== */
/**
 * 生成座位图：按区域 -> 行 -> 列
 * 每行 10 个座位，状态随机（AVAILABLE 多，SOLD/DISABLED 少）
 */
export function generateSeats(sessionId: number): SeatArea[] {
  const categories = mockCategories.filter((c) => c.sessionId === sessionId)
  const areas: SeatArea[] = []
  let seatIdBase = sessionId * 1000

  // 按票档动态生成区域：每票档一个区域，区域名 = 票档 name
  // 行字母跨区域不重叠：第一个区域从 A 开始，每个区域分配 3 行
  let letterCode = 65 // 'A'
  for (const cat of categories) {
    const seats: Seat[] = []
    const rowNames: string[] = []
    // 每个区域分配 3 行座位
    for (let r = 0; r < 3; r++) {
      const row = String.fromCharCode(letterCode + r)
      rowNames.push(row)
      for (let col = 1; col <= 12; col++) {
        seatIdBase++
        // 随机状态：70% AVAILABLE, 15% SOLD, 10% LOCKED, 5% DISABLED
        const rand = Math.random()
        let status: Seat['status'] = SeatStatus.AVAILABLE
        if (rand > 0.95) status = SeatStatus.DISABLED
        else if (rand > 0.85) status = SeatStatus.LOCKED
        else if (rand > 0.7) status = SeatStatus.SOLD
        seats.push({
          id: seatIdBase,
          row,
          col,
          area: cat.name,
          status,
          lockUserId: status === 'LOCKED' ? (Math.random() > 0.5 ? 2 : 99) : undefined,
          categoryId: cat.id,
          price: cat.price
        })
      }
    }
    letterCode += 3 // 下一个区域从新的字母开始，避免行名重叠
    areas.push({ area: cat.name, seats, rows: rowNames })
  }
  return areas
}

/* ============== 订单 ============== */
export const mockOrders: OrderListItem[] = [
  {
    orderNo: 'ST202609230001',
    sessionId: 101,
    eventTitle: '周杰伦「嘉年华」世界巡回演唱会·北京站',
    showTime: '2026-10-15 19:30:00',
    venue: '国家体育场（鸟巢）',
    payAmount: 576000,
    status: OrderStatus.UNPAID,
    username: 'user',
    // expireTime 设为未来时间，避免进入订单详情页立即触发超时关单
    expireTime: '2026-10-15 19:20:00',
    createTime: '2026-09-23 19:45:00',
    orderType: 'SEAT',
    items: [
      { ticketCategoryId: 1002, categoryName: '内场A区', price: 188000, quantity: 2, seatIds: [101001, 101002], seatLabels: ['A1', 'A2'] }
    ]
  },
  {
    orderNo: 'ST202609220002',
    sessionId: 201,
    eventTitle: '五月天「好好好想见到你」演唱会·上海站',
    showTime: '2026-11-08 19:00:00',
    venue: '上海体育场',
    payAmount: 216000,
    status: OrderStatus.PAID,
    username: 'user',
    createTime: '2026-09-22 15:30:00',
    orderType: 'NORMAL',
    items: [
      { ticketCategoryId: 2002, categoryName: '看台A区', price: 108000, quantity: 2 }
    ]
  },
  {
    orderNo: 'ST202609150003',
    sessionId: 301,
    eventTitle: '话剧《如梦之梦》· 广州站',
    showTime: '2026-10-20 14:00:00',
    venue: '广州大剧院',
    payAmount: 38000,
    status: OrderStatus.FINISHED,
    username: 'user',
    createTime: '2026-09-15 10:00:00',
    orderType: 'NORMAL',
    items: [
      { ticketCategoryId: 3003, categoryName: '二层', price: 38000, quantity: 1 }
    ]
  },
  {
    orderNo: 'ST202609100004',
    sessionId: 302,
    eventTitle: '话剧《如梦之梦》· 广州站',
    showTime: '2026-10-20 19:30:00',
    venue: '广州大剧院',
    payAmount: 176000,
    status: OrderStatus.REFUNDING,
    username: 'user',
    createTime: '2026-09-10 20:00:00',
    orderType: 'SEAT',
    items: [
      { ticketCategoryId: 3002, categoryName: '一层', price: 88000, quantity: 2, seatIds: [302010, 302011], seatLabels: ['D1', 'D2'] }
    ]
  },
  {
    orderNo: 'ST202609050005',
    sessionId: 102,
    eventTitle: '周杰伦「嘉年华」世界巡回演唱会·北京站',
    showTime: '2026-10-16 19:30:00',
    venue: '国家体育场（鸟巢）',
    payAmount: 256000,
    status: OrderStatus.CANCELED,
    username: 'user',
    createTime: '2026-09-05 11:00:00',
    orderType: 'NORMAL',
    items: [
      { ticketCategoryId: 1003, categoryName: '看台B区', price: 128000, quantity: 2 }
    ]
  }
]

/* ============== 预约 ============== */
export const mockReservations: ReservationItem[] = [
  {
    id: 1,
    sessionId: 101,
    categoryId: 1001,
    eventTitle: '周杰伦「嘉年华」世界巡回演唱会·北京站',
    showTime: '2026-10-15 19:30:00',
    categoryName: '内场VIP',
    status: 'PENDING',
    createTime: '2026-09-20 10:00:00'
  }
]

/* ============== 首页轮播图 ============== */
export interface BannerItem {
  id: number
  title: string
  subtitle: string
  image: string
  /** 点击跳转的演出 ID */
  eventId: number
}

export const mockBanners: BannerItem[] = [
  {
    id: 1,
    title: '周杰伦「嘉年华」世界巡回演唱会',
    subtitle: '北京 · 国家体育场（鸟巢）· 10月15日',
    image: 'https://picsum.photos/seed/banner1/1200/360',
    eventId: 1
  },
  {
    id: 2,
    title: '五月天「好好好想见到你」演唱会',
    subtitle: '上海 · 上海体育场 · 11月08日',
    image: 'https://picsum.photos/seed/banner2/1200/360',
    eventId: 2
  },
  {
    id: 3,
    title: '国庆特惠 · 全场满减',
    subtitle: '精选演出 限时优惠 最高立减 500 元',
    image: 'https://picsum.photos/seed/banner3/1200/360',
    eventId: 4
  },
  {
    id: 4,
    title: '德云社相声专场·北京站',
    subtitle: '北京 · 北展剧场 · 10月20日',
    image: 'https://picsum.photos/seed/banner4/1200/360',
    eventId: 6
  }
]

/* ============== 首页分类图标 ============== */
export interface CategoryIcon {
  id: number
  name: string
  /** 图标名称（前端自定义 SVG 图标） */
  icon: string
  /** 对应演出分类 */
  category: string
}

export const mockCategoryIcons: CategoryIcon[] = [
  { id: 1, name: '演唱会', icon: 'concert', category: '演唱会' },
  { id: 2, name: '话剧歌剧', icon: 'drama', category: '话剧' },
  { id: 3, name: '体育赛事', icon: 'sport', category: '体育赛事' },
  { id: 4, name: '儿童亲子', icon: 'kids', category: '音乐会' },
  { id: 5, name: '展览休闲', icon: 'exhibition', category: '演唱会' },
  { id: 6, name: '音乐会', icon: 'music', category: '音乐会' },
  { id: 7, name: '曲苑杂坛', icon: 'variety', category: '话剧' },
  { id: 8, name: '舞蹈芭蕾', icon: 'dance', category: '话剧' },
  { id: 9, name: '二次元', icon: 'anime', category: '演唱会' },
  { id: 10, name: '旅游展览', icon: 'travel', category: '体育赛事' }
]

/* ============== 城市列表 ============== */
export const mockCities: string[] = [
  '北京', '上海', '广州', '深圳', '杭州', '成都',
  '南京', '武汉', '西安', '重庆', '苏州', '天津',
  '长沙', '青岛', '厦门', '大连', '宁波', '郑州'
]

/* ============== 工具：根据 orderNo 取订单详情 ============== */
export function getOrderDetail(orderNo: string): OrderDetail | null {
  const order = mockOrders.find((o) => o.orderNo === orderNo)
  if (!order) return null
  return {
    ...order,
    attendees: [
      { name: '张三', phone: '13800138000', idCard: '110101199001011234' }
    ],
    payTime: order.status === 'PAID' || order.status === 'FINISHED' ? '2026-09-22 15:35:00' : undefined,
    payNo: order.status === 'PAID' || order.status === 'FINISHED' ? 'PAY202609220001' : undefined
  }
}

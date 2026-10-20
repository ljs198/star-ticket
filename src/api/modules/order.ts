/**
 * Order 接口模块（api/modules/order.ts）
 *
 * 知识点：
 * 1. 下单（PRD v2.0）：POST /orders，Header Idempotency-Key 必填
 *    Body {sessionId, orderType:'NORMAL'|'SEAT', items:[{ticketCategoryId, quantity, seatIds?}], attendees:[{name, phone, idCard?}]}
 *    响应 {orderNo, payAmount, status, expireTime}
 * 2. 价格由后端计算，前端请求体不含价格字段
 * 3. 防重：Idempotency-Key + 按钮 loading 双保险
 * 4. 订单列表/详情/取消，遵循统一分页响应
 */
import { get, post } from '@/api/http'
import type { CustomAxiosRequestConfig } from '@/api/http'
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderDetail,
  OrderListQuery,
  OrderListItem,
  PageResult
} from '@/api/types'

export const orderApi = {
  /**
   * 创建订单
   * @param data 订单数据
   * @param idempotencyKey 幂等键（必填），由 utils/idempotency.ts 生成
   */
  create(data: CreateOrderRequest, idempotencyKey: string) {
    const config: CustomAxiosRequestConfig = { idempotencyKey }
    return post<CreateOrderResponse>('/orders', data, config)
  },
  /** 订单列表 */
  list(params: OrderListQuery) {
    return get<PageResult<OrderListItem>>('/orders', params)
  },
  /** 订单详情 */
  detail(orderNo: string) {
    return get<OrderDetail>(`/orders/${orderNo}`)
  },
  /** 取消订单 */
  cancel(orderNo: string) {
    return post<void>(`/orders/${orderNo}/cancel`)
  },
  /** 申请退款 */
  refund(orderNo: string) {
    return post<void>(`/orders/${orderNo}/refund`)
  }
}

export default orderApi

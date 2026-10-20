/**
 * 管理端 - 订单接口模块（api/modules/admin/order.ts）
 *
 * 知识点：
 * 1. 管理端只读 + 高级操作：列表/详情/强制取消/退款审批
 * 2. 不允许创建订单（订单只能用户端创建）
 */
import { get, post } from '@/api/http'
import type { OrderDetail, OrderListQuery, OrderListItem, PageResult } from '@/api/types'

export const adminOrderApi = {
  list(params: OrderListQuery) {
    return get<PageResult<OrderListItem>>('/admin/orders', params)
  },
  detail(orderNo: string) {
    return get<OrderDetail>(`/admin/orders/${orderNo}`)
  },
  /** 管理员强制取消订单 */
  forceCancel(orderNo: string, reason: string) {
    return post<void>(`/admin/orders/${orderNo}/force-cancel`, { reason })
  },
  /** 退款审批：通过/驳回 */
  approveRefund(orderNo: string, approved: boolean) {
    return post<void>(`/admin/orders/${orderNo}/refund/approval`, { approved })
  }
}

export default adminOrderApi

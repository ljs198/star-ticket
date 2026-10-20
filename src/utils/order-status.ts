/**
 * 工具：订单状态映射与状态机校验（utils/order-status.ts）
 *
 * 知识点：
 * 1. 订单状态机由后端驱动，前端不自行推断流转
 * 2. 状态机迁移规则（PRD v2.0 第 6 条）：
 *    - UNPAID -> PAID（支付成功）
 *    - UNPAID -> CANCELED（用户取消/超时关单）
 *    - PAID -> REFUNDING（申请退款）
 *    - REFUNDING -> REFUNDED（退款成功）
 *    - REFUNDING -> PAID（退款驳回，恢复已支付）
 *    - PAID -> FINISHED（观演结束，定时任务）
 * 3. 每个状态对应一套按钮操作（取消/支付/退款/查看）
 * 4. 枚举大写下划线与后端一致
 */

/** 订单状态枚举（前后端一致） */
export enum OrderStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  REFUNDING = 'REFUNDING',
  REFUNDED = 'REFUNDED',
  FINISHED = 'FINISHED'
}

/** 状态机迁移表 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.UNPAID]: [OrderStatus.PAID, OrderStatus.CANCELED],
  [OrderStatus.PAID]: [OrderStatus.REFUNDING, OrderStatus.FINISHED],
  [OrderStatus.CANCELED]: [],
  [OrderStatus.REFUNDING]: [OrderStatus.REFUNDED, OrderStatus.PAID],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.FINISHED]: []
}

interface OrderStatusMeta {
  label: string
  type: 'success' | 'warning' | 'info' | 'danger' | 'primary'
  color: string
}

/** 状态 -> UI 元信息 */
const STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  [OrderStatus.UNPAID]: { label: '待支付', type: 'warning', color: 'var(--color-warning)' },
  [OrderStatus.PAID]: { label: '已支付', type: 'primary', color: 'var(--color-info)' },
  [OrderStatus.CANCELED]: { label: '已取消', type: 'info', color: 'var(--color-text-placeholder)' },
  [OrderStatus.REFUNDING]: { label: '退款中', type: 'warning', color: 'var(--color-warning)' },
  [OrderStatus.REFUNDED]: { label: '已退款', type: 'info', color: 'var(--color-text-placeholder)' },
  [OrderStatus.FINISHED]: { label: '已完成', type: 'success', color: 'var(--color-success)' }
}

export function getOrderStatusMeta(status: OrderStatus): OrderStatusMeta {
  return STATUS_META[status] ?? { label: '未知', type: 'info', color: 'var(--color-text-placeholder)' }
}

/** 校验状态迁移是否合法 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

/** 是否处于终态（不可再变更） */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status]?.length === 0
}

/** 是否可取消 */
export function canCancel(status: OrderStatus): boolean {
  return status === OrderStatus.UNPAID
}

/** 是否可支付 */
export function canPay(status: OrderStatus): boolean {
  return status === OrderStatus.UNPAID
}

/** 是否可申请退款 */
export function canRefund(status: OrderStatus): boolean {
  return status === OrderStatus.PAID
}

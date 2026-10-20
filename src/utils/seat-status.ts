/**
 * 工具：座位状态映射（utils/seat-status.ts）
 *
 * 知识点：
 * 1. 枚举（const enum）：编译期常量，体积小，TS 推荐
 * 2. 状态机：每个 status 对应一套 UI 表现（颜色/文字/可点击性）
 * 3. LOCKED 需按 lockUserId 二次区分（我锁的 vs 他人锁定）
 * 4. 颜色映射从 variables.scss 的 CSS 变量读取，便于换肤
 * 5. failReason 枚举（SEAT_TAKEN/NOT_AVAILABLE/LIMIT_EXCEEDED）：锁座失败原因
 */

/** 座位状态枚举（前后端一致，大写下划线） */
export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  SOLD = 'SOLD',
  DISABLED = 'DISABLED'
}

/** 锁座失败原因枚举 */
export enum SeatLockFailReason {
  SEAT_TAKEN = 'SEAT_TAKEN',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED'
}

interface SeatStyle {
  label: string
  color: string
  hoverable: boolean
}

/** 根据座位状态获取样式配置 */
export function getSeatStyle(status: SeatStatus, isMine = false): SeatStyle {
  switch (status) {
    case SeatStatus.AVAILABLE:
      return {
        label: '可售',
        color: 'var(--color-seat-available)',
        hoverable: true
      }
    case SeatStatus.LOCKED:
      return {
        label: isMine ? '我锁的' : '已锁定',
        color: isMine ? 'var(--color-seat-locked-me)' : 'var(--color-seat-locked-other)',
        hoverable: isMine
      }
    case SeatStatus.SOLD:
      return {
        label: '已售',
        color: 'var(--color-seat-sold)',
        hoverable: false
      }
    case SeatStatus.DISABLED:
      return {
        label: '禁用',
        color: 'var(--color-seat-disabled)',
        hoverable: false
      }
    default:
      return {
        label: '未知',
        color: 'var(--color-text-placeholder)',
        hoverable: false
      }
  }
}

/** 锁座失败原因文案映射 */
const FAIL_REASON_LABEL: Record<SeatLockFailReason, string> = {
  [SeatLockFailReason.SEAT_TAKEN]: '座位已被他人锁定',
  [SeatLockFailReason.NOT_AVAILABLE]: '座位不可售',
  [SeatLockFailReason.LIMIT_EXCEEDED]: '超出限购数量'
}

export function getFailReasonLabel(reason: string): string {
  return (
    FAIL_REASON_LABEL[reason as SeatLockFailReason] ??
    '座位锁定失败'
  )
}

/** 最大可选座位数（PRD v2.0：批量 1-4 个） */
export const MAX_SEAT_COUNT = 4

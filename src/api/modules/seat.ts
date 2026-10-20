/**
 * Seat 接口模块（api/modules/seat.ts）
 *
 * 知识点：
 * 1. 批量锁座（PRD v2.0）：POST /seats/lock，body {sessionId, seatIds:[1-4]}
 *    响应 {expireAt, results:[{seatId, success, failReason}]}
 * 2. failReason 枚举 SEAT_TAKEN/NOT_AVAILABLE/LIMIT_EXCEEDED
 * 3. 锁座超时由后端 15 分钟自动释放，前端按 expireAt 驱动倒计时
 * 4. 释放座位：DELETE /seats/lock，body {sessionId, seatIds}
 * 5. 座位图查询：GET /sessions/:id/seats，按 area 分组
 */
import { get, post, del } from '@/api/http'
import type { Seat, SeatArea, SeatLockRequest, SeatLockResponse } from '@/api/types'

export const seatApi = {
  /** 查询场次座位图（按区域分组） */
  getSeatMap(sessionId: number) {
    return get<SeatArea[]>(`/sessions/${sessionId}/seats`)
  },
  /** 查询某场次下我的座位（页面刷新恢复用） */
  getMyLockedSeats(sessionId: number) {
    return get<Seat[]>(`/sessions/${sessionId}/seats/mine`)
  },
  /** 批量锁座 */
  lock(data: SeatLockRequest) {
    return post<SeatLockResponse>('/seats/lock', data)
  },
  /** 释放座位 */
  unlock(data: SeatLockRequest) {
    return del<void>('/seats/lock', { data })
  }
}

export default seatApi

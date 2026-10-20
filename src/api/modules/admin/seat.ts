/**
 * 管理端 - 座位接口模块（api/modules/admin/seat.ts）
 *
 * 知识点：
 * 1. 嵌套资源：/admin/sessions/:sessionId/seats
 * 2. 批量生成座位：根据区域/行数/列数一键生成
 * 3. 单个修改状态（启用/禁用）
 */
import { get, post, put } from '@/api/http'
import type { Seat } from '@/api/types'

export interface BatchCreateSeatPayload {
  area: string
  rows: string[] /** ['A','B','C'] */
  cols: number /** 列数 */
  categoryId?: number
  status?: Seat['status']
}

export const adminSeatApi = {
  /** 场次座位列表 */
  list(sessionId: number) {
    return get<Seat[]>(`/admin/sessions/${sessionId}/seats`)
  },
  /** 批量生成座位 */
  batchCreate(sessionId: number, data: BatchCreateSeatPayload) {
    return post<Seat[]>(`/admin/sessions/${sessionId}/seats/batch`, data)
  },
  /** 修改座位状态 */
  update(id: number, data: Partial<Seat>) {
    return put<Seat>(`/admin/seats/${id}`, data)
  }
}

export default adminSeatApi

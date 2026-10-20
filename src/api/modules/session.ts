/**
 * Session 接口模块（api/modules/session.ts）
 *
 * 知识点：
 * 1. 场次列表按 eventId 维度查询
 * 2. 场次详情含剩余座位数等聚合信息
 */
import { get } from '@/api/http'
import type { SessionItem, TicketCategory } from '@/api/types'

export const sessionApi = {
  /** 某演出下场次列表 */
  listByEvent(eventId: number) {
    return get<SessionItem[]>(`/events/${eventId}/sessions`)
  },
  /** 场次详情 */
  detail(sessionId: number) {
    return get<SessionItem>(`/sessions/${sessionId}`)
  },
  /** 场次下的票档列表 */
  categories(sessionId: number) {
    return get<TicketCategory[]>(`/sessions/${sessionId}/categories`)
  }
}

export default sessionApi

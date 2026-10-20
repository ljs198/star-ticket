/**
 * 管理端 - 场次接口模块（api/modules/admin/session.ts）
 *
 * 知识点：
 * 1. 嵌套路由资源：/admin/events/:eventId/sessions
 * 2. 场次归属于某演出
 */
import { get, post, put, del } from '@/api/http'
import type { SessionItem } from '@/api/types'

export const adminSessionApi = {
  list(eventId: number) {
    return get<SessionItem[]>(`/admin/events/${eventId}/sessions`)
  },
  detail(id: number) {
    return get<SessionItem>(`/admin/sessions/${id}`)
  },
  create(eventId: number, data: Partial<SessionItem>) {
    return post<SessionItem>(`/admin/events/${eventId}/sessions`, data)
  },
  update(id: number, data: Partial<SessionItem>) {
    return put<SessionItem>(`/admin/sessions/${id}`, data)
  },
  remove(id: number) {
    return del<void>(`/admin/sessions/${id}`)
  }
}

export default adminSessionApi

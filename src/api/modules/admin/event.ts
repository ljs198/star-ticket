/**
 * 管理端 - 演出接口模块（api/modules/admin/event.ts）
 *
 * 知识点：
 * 1. 管理端 CRUD 接口，需 ADMIN 权限（守卫与指令控制）
 * 2. 创建/更新接口的 body 与列表 item 类型一致
 */
import { get, post, put, del } from '@/api/http'
import type { EventItem, EventListQuery, PageResult } from '@/api/types'

export const adminEventApi = {
  list(params: EventListQuery) {
    return get<PageResult<EventItem>>('/admin/events', params)
  },
  detail(id: number) {
    return get<EventItem>(`/admin/events/${id}`)
  },
  create(data: Partial<EventItem>) {
    return post<EventItem>('/admin/events', data)
  },
  update(id: number, data: Partial<EventItem>) {
    return put<EventItem>(`/admin/events/${id}`, data)
  },
  remove(id: number) {
    return del<void>(`/admin/events/${id}`)
  },
  /** 上架/下架 */
  updateStatus(id: number, status: EventItem['status']) {
    return put<EventItem>(`/admin/events/${id}/status`, { status })
  }
}

export default adminEventApi

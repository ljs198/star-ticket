/**
 * Event 接口模块（api/modules/event.ts）
 *
 * 知识点：
 * 1. 列表分页：使用 PageResult<T> 包装返回
 * 2. 详情：直接返回 EventItem
 * 3. 用户端只读：列表/详情，不涉及创建修改
 */
import { get } from '@/api/http'
import type { EventItem, EventListQuery, PageResult } from '@/api/types'

export const eventApi = {
  /** 演出列表（路由 GET /events） */
  list(params: EventListQuery) {
    return get<PageResult<EventItem>>('/events', params)
  },
  /** 演出详情（路由 GET /events/:id） */
  detail(id: number) {
    return get<EventItem>(`/events/${id}`)
  }
}

export default eventApi

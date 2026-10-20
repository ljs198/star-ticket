/**
 * 管理端 - 票档接口模块（api/modules/admin/category.ts）
 *
 * 知识点：
 * 1. 嵌套资源：/admin/sessions/:sessionId/categories
 * 2. 价格单位：分（前端展示元，提交时 * 100）
 */
import { get, post, put, del } from '@/api/http'
import type { TicketCategory } from '@/api/types'

export const adminCategoryApi = {
  list(sessionId: number) {
    return get<TicketCategory[]>(`/admin/sessions/${sessionId}/categories`)
  },
  create(sessionId: number, data: Partial<TicketCategory>) {
    return post<TicketCategory>(`/admin/sessions/${sessionId}/categories`, data)
  },
  update(id: number, data: Partial<TicketCategory>) {
    return put<TicketCategory>(`/admin/categories/${id}`, data)
  },
  remove(id: number) {
    return del<void>(`/admin/categories/${id}`)
  }
}

export default adminCategoryApi

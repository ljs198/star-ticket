/**
 * Reservation 接口模块（api/modules/reservation.ts）
 *
 * 知识点：
 * 1. 预约唯一性：同用户同场次同票档只能预约一次（后端校验）
 * 2. 预约场景：未开售场次只能预约不能下单
 * 3. 我的预约列表
 */
import { get, post, del } from '@/api/http'
import type { PageQuery, PageResult, ReservationItem, ReservationRequest } from '@/api/types'

export const reservationApi = {
  /** 创建预约 */
  create(data: ReservationRequest) {
    return post<ReservationItem>('/reservations', data)
  },
  /** 我的预约列表 */
  list(params: PageQuery) {
    return get<PageResult<ReservationItem>>('/reservations', params)
  },
  /** 取消预约 */
  cancel(id: number) {
    return del<void>(`/reservations/${id}`)
  }
}

export default reservationApi

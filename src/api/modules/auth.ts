/**
 * Auth 接口模块（api/modules/auth.ts）
 *
 * 知识点：
 * 1. 按业务域划分 module：auth/event/session/seat/order/payment/reservation
 * 2. 每个模块只暴露纯函数，由调用方传入参数
 * 3. 类型由 api/types.ts 统一定义，避免重复声明
 * 4. 登录/注册/profile 走此模块
 */
import { get, post, put } from '@/api/http'
import type { LoginRequest, LoginResponse, RegisterRequest, UserInfo } from '@/api/types'

export const authApi = {
  /** 登录 */
  login(data: LoginRequest) {
    return post<LoginResponse>('/auth/login', data)
  },
  /** 注册 */
  register(data: RegisterRequest) {
    return post<LoginResponse>('/auth/register', data)
  },
  /** 获取当前用户信息（刷新页面后拉取） */
  getProfile() {
    return get<UserInfo>('/auth/profile')
  },
  /** 更新个人资料 */
  updateProfile(data: Partial<UserInfo>) {
    return put<UserInfo>('/auth/profile', data)
  },
  /** 退出登录 */
  logout() {
    return post<void>('/auth/logout')
  }
}

export default authApi

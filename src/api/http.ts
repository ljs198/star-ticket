/**
 * Axios 实例与拦截器（api/http.ts）
 *
 * 知识点：
 * 1. axios.create()：创建独立实例，避免污染全局 axios
 * 2. baseURL：开发环境通过 vite proxy 转发，前端统一写 /api 前缀
 * 3. timeout 10s：PRD v2.0 统一超时配置
 * 4. 请求拦截器：
 *    - 注入 Authorization: Bearer <token>（JWT 模式）
 *    - 自定义 Idempotency-Key 头（通过 config.idempotencyKey 传入，下单/支付用）
 * 5. 响应拦截器：
 *    - 解析后端统一结构 { code, message, data, traceId }
 *    - code === 0 视为成功，返回 data
 *    - code !== 0 进入错误处理：分层错误码（HTTP 状态 + 业务码）
 *    - 401 强制退出登录
 *    - 失败时 reject BusinessError，业务侧用 try/catch 捕获
 * 6. 错误统一格式：{ code, message, httpStatus, traceId, bizCode }
 *
 * 与后端对接契约（PRD v2.0 第 8 章）：
 * - 统一响应：{ code:0, message:'success', data:..., traceId:'xxx' }
 * - 错误响应：{ code:<业务码>, message:'<错误信息>', data:null, traceId:'xxx' }
 *   其中 HTTP 状态码由后端按 422/409/423/429/503 返回
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, clearAuth } from '@/utils/auth'
import {
  HTTP_STATUS,
  getHttpErrorMessage,
  getBizErrorMessage,
  shouldForceLogout
} from '@/utils/error-code'

// Mock 适配器（开发环境 VITE_USE_MOCK=true 时启用，无需后端即可完整测试）
import { mockAdapter } from '@/mock'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** 业务统一响应结构 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  traceId?: string
}

/** 业务错误类型（携带 traceId 便于排查） */
export interface BusinessError {
  code: number
  message: string
  httpStatus?: number
  traceId?: string
  bizCode?: number
}

/** 扩展 AxiosRequestConfig：支持业务侧传递幂等键 */
export interface CustomAxiosRequestConfig<T = unknown> extends AxiosRequestConfig {
  idempotencyKey?: string
  /** 是否静默（不弹全局 Message），默认 false */
  silent?: boolean
  /** 业务侧期望的返回类型 */
  _dataType?: T
}

const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  },
  // 开发 Mock 模式：用 mockAdapter 替换真实网络请求
  adapter: USE_MOCK ? mockAdapter : undefined
})

/* ============== 请求拦截器 ============== */
service.interceptors.request.use(
  (config) => {
    // 注入 JWT Token
    const token = getToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    // 注入幂等键（下单/支付必带）
    const custom = config as CustomAxiosRequestConfig
    if (custom.idempotencyKey) {
      config.headers = config.headers ?? {}
      config.headers['Idempotency-Key'] = custom.idempotencyKey
    }
    return config
  },
  (error) => Promise.reject(error)
)

/* ============== 响应拦截器 ============== */
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    const custom = response.config as CustomAxiosRequestConfig

    // code === 0 视为成功
    if (res.code === 0) {
      return res.data as unknown as AxiosResponse
    }

    // 业务失败：构造 BusinessError 抛出
    const httpStatus = response.status
    const bizCode = res.code
    const message = getBizErrorMessage(bizCode, res.message || '操作失败')

    // 401 / 账户锁定 -> 强制退出
    if (shouldForceLogout(httpStatus, bizCode)) {
      handleForceLogout()
    }

    // 非静默模式弹全局错误提示
    if (!custom.silent) {
      ElMessage.error(message)
    }

    const err: BusinessError = {
      code: bizCode,
      message,
      httpStatus,
      traceId: res.traceId,
      bizCode
    }
    return Promise.reject(err)
  },
  (error) => {
    // 网络/超时/HTTP 4xx 5xx
    if (error.response) {
      const status = error.response.status
      const res: ApiResponse | undefined = error.response.data
      const bizCode = res?.code
      const message =
        (bizCode && getBizErrorMessage(bizCode)) ||
        res?.message ||
        getHttpErrorMessage(status)

      if (shouldForceLogout(status, bizCode)) {
        handleForceLogout()
      }

      // 401 -> 跳登录
      if (status === HTTP_STATUS.UNAUTHORIZED) {
        handleForceLogout()
      }

      const err: BusinessError = {
        code: bizCode ?? status,
        message,
        httpStatus: status,
        traceId: res?.traceId,
        bizCode
      }
      // 非静默弹错
      const custom = error.config as CustomAxiosRequestConfig
      if (!custom?.silent) {
        ElMessage.error(message)
      }
      return Promise.reject(err)
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后再试')
    } else if (!navigator.onLine) {
      ElMessage.error('网络已断开，请检查网络')
    } else {
      ElMessage.error('网络异常，请稍后再试')
    }
    return Promise.reject(error)
  }
)

/* ============== 强制退出登录 ============== */
let logoutTimer: number | null = null
function handleForceLogout() {
  // 防抖：避免拦截器多次触发重复跳转
  if (logoutTimer) return
  logoutTimer = window.setTimeout(() => {
    clearAuth()
    // 用 location 跳转，避免 router 循环依赖
    // 此处需 encodeURIComponent：直接设置 window.location.href，路径中的 ?& 会破坏 query 解析
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${redirect}`
    logoutTimer = null
  }, 300)
}

/* ============== 通用请求方法 ============== */
/**
 * get 请求
 * @param url 接口路径
 * @param params query 参数
 * @param config 额外配置
 */
export function get<T = unknown>(
  url: string,
  params?: object,
  config?: CustomAxiosRequestConfig
): Promise<T> {
  return service.get(url, { ...config, params }) as unknown as Promise<T>
}

/**
 * post 请求
 * @param url 接口路径
 * @param data 请求体
 * @param config 额外配置（可传 idempotencyKey）
 */
export function post<T = unknown>(
  url: string,
  data?: unknown,
  config?: CustomAxiosRequestConfig
): Promise<T> {
  return service.post(url, data, config) as unknown as Promise<T>
}

/**
 * put 请求
 */
export function put<T = unknown>(
  url: string,
  data?: unknown,
  config?: CustomAxiosRequestConfig
): Promise<T> {
  return service.put(url, data, config) as unknown as Promise<T>
}

/**
 * delete 请求
 */
export function del<T = unknown>(
  url: string,
  config?: CustomAxiosRequestConfig
): Promise<T> {
  return service.delete(url, config) as unknown as Promise<T>
}

export default service

/**
 * API 总出口（api/index.ts）
 *
 * 知识点：
 * 1. 统一 barrel 出口：业务侧只 import { orderApi } from '@/api'
 * 2. 类型也从此处导出，避免散落
 */
export * from './modules'
export * from './types'
export { default as http, get, post, put, del } from './http'
export type { ApiResponse, BusinessError, CustomAxiosRequestConfig } from './http'

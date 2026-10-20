/**
 * 工具：错误码分层处理（utils/error-code.ts）
 *
 * 知识点：
 * 1. HTTP 状态码 + 业务码双层：HTTP 4xx/5xx 粗判，业务码精确定位
 * 2. PRD v2.0 错误码规范：
 *    - 422（参数校验） -> 业务码 402xx
 *    - 409（冲突，座位被抢） -> 业务码 409xx
 *    - 423（锁定，限购超限） -> 业务码 423xx
 *    - 429（限流） -> 业务码 429xx
 *    - 503（服务不可用） -> 业务码 503xx
 * 3. 错误码 -> 文案映射表，避免散落在业务代码
 * 4. traceId 用于联调追踪：出问题时把 traceId 给后端排查
 */

/** HTTP 状态码分组 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  LOCKED: 423,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

/** 业务错误码 -> 文案 */
const BIZ_ERROR_MESSAGES: Record<number, string> = {
  // 422 参数校验（40200-40299）
  40201: '演出不存在或已下架',
  40202: '场次不存在',
  40203: '票档不存在',
  40204: '观演人信息不完整',
  40205: '下单数量超出限购',
  40206: '订单类型错误',

  // 409 冲突
  40901: '座位已被他人锁定',
  40902: '订单已支付，请勿重复操作',
  40903: '订单已取消',
  40904: '订单不存在',

  // 423 锁定
  42301: '已达限购上限',
  42302: '账户被锁定',

  // 429 限流
  42901: '请求过于频繁，请稍后再试',

  // 503 服务不可用
  50301: '座位服务暂不可用',
  50302: '支付服务暂不可用'
}

/** 根据业务码获取文案，未知码降级为通用文案 */
export function getBizErrorMessage(code: number, fallback = '操作失败，请稍后再试'): string {
  return BIZ_ERROR_MESSAGES[code] ?? fallback
}

/** HTTP 状态 -> 通用文案 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  [HTTP_STATUS.BAD_REQUEST]: '请求参数有误',
  [HTTP_STATUS.UNAUTHORIZED]: '登录已失效，请重新登录',
  [HTTP_STATUS.FORBIDDEN]: '暂无权限',
  [HTTP_STATUS.NOT_FOUND]: '资源不存在',
  [HTTP_STATUS.VALIDATION_ERROR]: '请求参数校验失败',
  [HTTP_STATUS.CONFLICT]: '操作冲突',
  [HTTP_STATUS.LOCKED]: '资源被锁定',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [HTTP_STATUS.SERVER_ERROR]: '服务器内部错误',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: '服务暂不可用'
}

export function getHttpErrorMessage(status: number): string {
  return HTTP_ERROR_MESSAGES[status] ?? '网络异常，请稍后再试'
}

/**
 * 是否需要强制退出登录
 * 401 / 42302（账户锁定）需踢出
 */
export function shouldForceLogout(status: number, bizCode?: number): boolean {
  return status === HTTP_STATUS.UNAUTHORIZED || bizCode === 42302
}

/**
 * 是否需要重试（限流或服务不可用）
 * 业务侧用此判断是否进重试逻辑
 */
export function shouldRetry(status: number): boolean {
  return (
    status === HTTP_STATUS.TOO_MANY_REQUESTS ||
    status === HTTP_STATUS.SERVICE_UNAVAILABLE
  )
}

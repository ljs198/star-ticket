/**
 * 工具：UUID 生成（utils/idempotency.ts）
 *
 * 知识点：
 * 1. 幂等键：相同 Idempotency-Key 重复请求，后端返回上次结果，防止重复下单
 * 2. UUID v4：随机生成 128 位标识，碰撞概率极低
 * 3. crypto.randomUUID()：浏览器原生 API（HTTPS/localhost），优先使用
 * 4. 兜底实现：手动拼接随机 16 进制，保证非安全上下文也可用
 * 5. 应用场景：下单、支付回调、批量锁座
 */

/**
 * 生成 UUID v4
 * 优先使用 crypto.randomUUID（原生 API），否则使用兜底实现
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 兜底实现：随机 16 进制拼接成 8-4-4-4-12 格式
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 生成下单幂等键
 * @param prefix 业务前缀，便于排查
 */
export function genOrderKey(prefix = 'order'): string {
  return `${prefix}_${uuid()}`
}

/**
 * 生成支付幂等键
 */
export function genPayKey(prefix = 'pay'): string {
  return `${prefix}_${uuid()}`
}

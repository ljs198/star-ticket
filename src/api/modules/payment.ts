/**
 * Payment 接口模块（api/modules/payment.ts）
 *
 * 知识点：
 * 1. 模拟支付（PRD v2.0）：POST /pay/mock/notify
 *    Body {orderNo, amount, payNo}
 *    响应 {payNo, orderStatus, duplicated}
 * 2. 幂等：相同 payNo 重复请求后端返回上次结果（duplicated=true 表示重复）
 * 3. 前端 payNo 用 UUID 生成（utils/idempotency.ts），点击后按钮 loading 防止重复点击
 * 4. amount 来自订单详情 payAmount，前端传值不信任，后端再校验
 */
import { post } from '@/api/http'
import type { CustomAxiosRequestConfig } from '@/api/http'
import type { PayMockRequest, PayMockResponse } from '@/api/types'

export const paymentApi = {
  /** 模拟支付 */
  mockPay(data: PayMockRequest, idempotencyKey: string) {
    const config: CustomAxiosRequestConfig = { idempotencyKey }
    return post<PayMockResponse>('/pay/mock/notify', data, config)
  }
}

export default paymentApi

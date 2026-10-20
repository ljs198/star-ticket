/**
 * 订单 Store（stores/order.ts）
 *
 * 知识点：
 * 1. 订单列表 + 当前订单详情缓存
 * 2. 下单流程：写入当前订单（用于支付页跳转），不强制走 store
 * 3. 状态轮询：useOrderStatus composable 通过 store 读取当前订单
 * 4. localStorage 草稿：观演人表单暂存（弱网兜底，PRD v2.0 第 12 条）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateOrderResponse, OrderListItem } from '@/api/types'

const DRAFT_KEY = 'star_ticket_attendee_draft'

export const useOrderStore = defineStore('order', () => {
  /* ============== state ============== */
  /** 下单成功后的当前订单（用于跳转支付页） */
  const currentOrder = ref<CreateOrderResponse | null>(null)
  /** 订单列表缓存（仅当前页） */
  const orderList = ref<OrderListItem[]>([])

  /* ============== actions ============== */
  function setCurrentOrder(order: CreateOrderResponse) {
    currentOrder.value = order
  }

  function clearCurrentOrder() {
    currentOrder.value = null
  }

  /** 保存观演人草稿（localStorage） */
  function saveAttendeeDraft(attendees: Array<{ name: string; phone: string; idCard?: string }>) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(attendees))
    } catch {
      /* ignore */
    }
  }

  /** 读取观演人草稿 */
  function loadAttendeeDraft<T = Array<{ name: string; phone: string; idCard?: string }>>(): T | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }

  /** 清空草稿 */
  function clearAttendeeDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }

  return {
    currentOrder,
    orderList,
    setCurrentOrder,
    clearCurrentOrder,
    saveAttendeeDraft,
    loadAttendeeDraft,
    clearAttendeeDraft
  }
})

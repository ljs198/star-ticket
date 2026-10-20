/**
 * 权限指令（directive/permission.ts）
 *
 * 知识点：
 * 1. 自定义指令：Vue 的指令机制，扩展原生 HTML 元素行为
 * 2. v-permission="'admin'"：用户角色不匹配时移除元素
 * 3. mounted 钩子：元素挂载时检查，从 user store 读 role
 * 4. 实现策略：不通过则 el.parentNode.removeChild(el)，彻底从 DOM 移除
 *    （v-if 也能实现，但指令更声明式，业务侧无需关心）
 * 5. 升级方向：可支持多角色、权限点列表 ['admin','editor']
 */
import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'

type PermissionValue = string | string[]

/** 判断当前用户是否具备所需角色 */
function hasPermission(required: PermissionValue): boolean {
  const userStore = useUserStore()
  const role = userStore.role.toUpperCase()
  if (Array.isArray(required)) {
    return required.some((r) => r.toUpperCase() === role)
  }
  return required.toUpperCase() === role
}

export const permission: Directive<HTMLElement, PermissionValue> = {
  mounted(el, binding) {
    if (!binding.value) return
    if (!hasPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  }
}

export default permission

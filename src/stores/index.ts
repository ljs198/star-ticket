/**
 * Pinia Store 统一导出（stores/index.ts）
 *
 * 知识点：
 * 1. barrel pattern：业务侧 `import { useUserStore, useCartStore } from '@/stores'`
 * 2. main.ts 中 createPinia() 后所有 store 都可用
 */
export { useUserStore } from './user'
export { useCartStore } from './cart'
export { useOrderStore } from './order'

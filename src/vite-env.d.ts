/// <reference types="vite/client" />

/**
 * Vite 环境变量类型声明（src/vite-env.d.ts）
 *
 * 知识点：
 * 1. vite/client 提供 import.meta.env 类型与 import.meta.glob
 * 2. 自定义 VITE_ 变量在此声明，业务侧 import.meta.env.VITE_API_BASE_URL 有类型
 * 3. CSS 模块类型也可在此声明（本项目未用 CSS 模块，省略）
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_USE_MOCK: string
  readonly BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

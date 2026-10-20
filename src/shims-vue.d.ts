/**
 * Vue SFC 类型声明（src/shims-vue.d.ts）
 *
 * 知识点：
 * 1. .vue 文件 TS 默认不识别，需声明模块类型
 * 2. 声明后 import App from './App.vue' 拿到 DefineComponent 类型
 * 3. 必须放在 include 路径内（tsconfig 已包含 src 下的 .d.ts 文件）
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

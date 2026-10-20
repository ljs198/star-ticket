/**
 * 应用入口 main.ts
 *
 * 知识点：
 * 1. createApp(App)：创建 Vue 应用实例
 * 2. app.use(pinia)：必须先于 router 挂载，保证守卫中可用 store
 * 3. app.use(router)：注册路由插件，启用 <router-view> 与 useRouter/useRoute
 * 4. ElementPlus 样式：完整引入 element-plus/dist/index.css，保证所有组件样式生效
 *    （unplugin-vue-components 按需引入组件代码，但基础样式仍需整体引入）
 * 5. 图标全局注册：遍历 @element-plus/icons-vue 全部注册，模板中可直接用 <Document />
 * 6. 全局样式入口：assets/styles/index.scss 在此引入一次
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Element Plus 完整样式（保证 el-form-item、el-input 等基础布局样式生效）
import 'element-plus/dist/index.css'

// 全局样式（顺序：reset -> variables(token) -> index(基础组件)）
import '@/assets/styles/index.scss'

// 全部 Element Plus 图标（全局注册，模板中直接用 <el-icon><Document /></el-icon>）
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)
const pinia = createPinia()

// 注册全部图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component as never)
}

// 顺序：pinia 先于 router，路由守卫中会读取 user store
app.use(pinia)
app.use(router)

app.mount('#app')

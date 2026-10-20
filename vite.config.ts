/**
 * Vite 配置文件（v2.0 改用 TS）
 *
 * 知识点：
 * 1. @vitejs/plugin-vue：Vue3 SFC（.vue 单文件组件）编译插件
 * 2. resolve.alias：路径别名，@ -> src，方便 import
 * 3. server.proxy：开发环境代理 /api -> 后端，规避浏览器跨域
 * 4. AutoImport / Components：自动导入 Vue/Pinia/Element Plus API，减少 import 模板
 * 5. build.target：现代浏览器构建目标
 * 6. css.preprocessorOptions：全局注入 variables.scss，所有组件可直接使用 token
 *
 * 联调说明：
 * - 开发环境后端地址 http://localhost:8080
 * - 请求路径 /api/* 会被代理转发到后端，前端代码统一写 /api 前缀
 */
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // GitHub Pages 子路径部署：生产环境资源统一加 /star-ticket/ 前缀，开发环境保持 /
    base: mode === 'production' ? '/star-ticket/' : '/',
    plugins: [
      vue(),
      // 自动导入 ref/reactive/computed/router 等核心 API
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: { enabled: false }
      }),
      // Element Plus 按需引入组件
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/components.d.ts'
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          // 全局注入设计 token，所有 .scss / .vue 可直接使用 var(--color-primary)
          additionalData: `@use "@/assets/styles/variables.scss" as *;`
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, '')
        }
      }
    },
    build: {
      target: 'es2015',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            element: ['element-plus', '@element-plus/icons-vue']
          }
        }
      }
    }
  }
})

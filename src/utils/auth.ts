/**
 * 工具：localStorage 封装 + token 管理（utils/auth.ts）
 *
 * 知识点：
 * 1. localStorage 持久化：浏览器原生 KV 存储，5MB 上限，同源共享
 * 2. JWT Token 模式：登录后服务端返回 token，前端存 localStorage，每次请求放入 Authorization Header
 * 3. try/catch 防止 SSR 或隐私模式下 localStorage 抛错
 * 4. KEY 加前缀避免多项目冲突（star_ticket_）
 */

const TOKEN_KEY = 'star_ticket_token'
const USER_KEY = 'star_ticket_user'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* 隐私模式或空间不足，静默失败 */
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function getStoredUser<T = unknown>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: unknown): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    /* ignore */
  }
}

export function removeStoredUser(): void {
  try {
    localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 清空所有 star_ticket_ 前缀的存储（退出登录用）
 */
export function clearAuth(): void {
  removeToken()
  removeStoredUser()
}

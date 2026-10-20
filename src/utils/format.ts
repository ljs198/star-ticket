/**
 * 工具：日期/金额/手机号格式化（utils/format.ts）
 *
 * 知识点：
 * 1. Date 对象与时间戳：JS 内置 Date，getTime() 返回毫秒
 * 2. String.prototype.padStart：左侧补零，确保两位
 * 3. 东八区：通过 getHours() 等本地方法，浏览器时区即用户时区，部署在国内即东八区
 * 4. Intl.NumberFormat：国际化金额格式（千分位）
 * 5. toFixed(2)：保留两位小数
 * 6. 正则脱敏：手机号 138****8888，身份证 1101**00**1
 */

/** 格式化日期为 yyyy-MM-dd HH:mm:ss（v2.0 统一格式） */
export function formatDateTime(date: Date | string | number, pattern = 'yyyy-MM-dd HH:mm:ss'): string {
  const d = toDate(date)
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const map: Record<string, string> = {
    yyyy: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds())
  }
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (m) => map[m] ?? m)
}

/** 仅日期 yyyy-MM-dd */
export function formatDate(date: Date | string | number): string {
  return formatDateTime(date, 'yyyy-MM-dd')
}

/** 仅时间 HH:mm */
export function formatTime(date: Date | string | number): string {
  return formatDateTime(date, 'HH:mm')
}

/** 字符串/时间戳 -> Date */
function toDate(input: Date | string | number): Date | null {
  if (input instanceof Date) return input
  if (typeof input === 'number') return new Date(input)
  if (typeof input === 'string') {
    // 兼容 ISO 8601 与 yyyy-MM-dd HH:mm:ss
    return new Date(input.replace(/-/g, '/'))
  }
  return null
}

/** 金额格式化（分 -> 元，保留两位小数） */
export function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** 金额格式化带千分位 */
export function formatMoneyWithSymbol(cents: number, symbol = '¥'): string {
  const yuan = (cents / 100).toFixed(2)
  const parts = yuan.split('.')
  const intPart = Number(parts[0]).toLocaleString('zh-CN')
  return `${symbol}${intPart}.${parts[1]}`
}

/** 手机号脱敏 138****8888 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/** 身份证脱敏 1101**00**1 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard
  return idCard.replace(/^(.{4}).*(.{4})$/, '$1****$2')
}

/** 倒计时秒 -> mm:ss */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

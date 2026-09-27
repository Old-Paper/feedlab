function trimNum(n: number, digits: number): string {
  const v = Number(n.toFixed(digits))
  return String(v)
}

/** 1234 -> "1234", 32000 -> "3.2万", 1.2e8 -> "1.2亿" */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0'
  if (n >= 1e8) return `${trimNum(n / 1e8, 1)}亿`
  if (n >= 1e4) return `${trimNum(n / 1e4, 1)}万`
  return String(Math.round(n))
}

export function formatViewsYouTube(n: number): string {
  return `${formatCount(n)}次观看`
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (x: number) => String(x).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** hoursAgo -> "5分钟前" / "3小时前" / "2天前" / "4个月前" / "1年前" */
export function formatPublishTime(hoursAgo: number): string {
  const h = Math.max(1, Math.round(hoursAgo))
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}天前`
  const mo = Math.round(h / (24 * 30))
  if (mo < 12) return `${mo}个月前`
  const y = Math.max(1, Math.round(h / (24 * 365)))
  return `${y}年前`
}

export function formatSeconds(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return '-'
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

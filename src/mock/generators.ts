// Deterministic SVG generators for mock covers and avatars. No real
// creator artwork is used — builtin distractor covers are程序生成的渐变卡.

function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const PALETTES: Array<[string, string]> = [
  ['#0ea5e9', '#1e3a8a'],
  ['#f97316', '#7c2d12'],
  ['#10b981', '#064e3b'],
  ['#a855f7', '#4c1d95'],
  ['#ef4444', '#7f1d1d'],
  ['#eab308', '#713f12'],
  ['#ec4899', '#831843'],
  ['#06b6d4', '#164e63'],
  ['#8b5cf6', '#312e81'],
  ['#84cc16', '#365314'],
  ['#f43f5e', '#4c0519'],
  ['#14b8a6', '#134e4a'],
]

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Extracts a short "cover keyword" from a title (first segment, ≤ 9 chars). */
export function shortenTitle(title: string): string {
  const cleaned = title.replace(/[【】\[\]()（）]/g, ' ').trim()
  const seg = cleaned.split(/[,,。!?？::、|,,\s]+/).find((s) => s.length > 0) ?? cleaned
  return seg.slice(0, 9)
}

const thumbCache = new Map<string, string>()

/** Deterministic 640×360 SVG thumbnail for a mock video. */
export function generateMockThumbDataUrl(id: string, title: string): string {
  const cached = thumbCache.get(id)
  if (cached) return cached
  const h = fnv1a(id)
  const [c1, c2] = PALETTES[h % PALETTES.length]
  const variant = (h >> 4) % 4
  const kw = shortenTitle(title)

  let decor = ''
  if (variant === 0) {
    decor = `<circle cx="${480 + (h % 120)}" cy="${70 + ((h >> 3) % 90)}" r="${110 + ((h >> 6) % 60)}" fill="#ffffff" opacity="0.14"/><circle cx="${100 + ((h >> 5) % 160)}" cy="${260 + ((h >> 8) % 60)}" r="60" fill="#000000" opacity="0.18"/>`
  } else if (variant === 1) {
    decor = `<rect x="-40" y="${200 + ((h >> 5) % 80)}" width="760" height="150" fill="#000000" opacity="0.22" transform="rotate(-6 320 320)"/><circle cx="${520 + (h % 90)}" cy="${80 + ((h >> 7) % 70)}" r="46" fill="#ffffff" opacity="0.22"/>`
  } else if (variant === 2) {
    decor = `<polygon points="640,0 640,240 380,0" fill="#ffffff" opacity="0.10"/><polygon points="0,360 0,200 260,360" fill="#000000" opacity="0.25"/>`
  } else {
    decor = `<rect x="${380 + (h % 120)}" y="${30 + ((h >> 6) % 60)}" width="180" height="180" rx="28" fill="#ffffff" opacity="0.16" transform="rotate(12 470 120)"/><circle cx="${90 + ((h >> 9) % 100)}" cy="${90 + ((h >> 4) % 60)}" r="34" fill="#ffffff" opacity="0.28"/>`
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="640" height="360" fill="url(#g)"/>` +
    decor +
    `<text x="40" y="298" font-size="62" font-weight="700" fill="#ffffff" stroke="rgba(0,0,0,0.35)" stroke-width="8" paint-order="stroke" font-family="'PingFang SC','Microsoft YaHei',sans-serif" transform="rotate(-3 40 298)">${esc(kw)}</text>` +
    `</svg>`

  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  thumbCache.set(id, url)
  return url
}

const avatarCache = new Map<string, string>()

/** Deterministic initial-letter avatar for a channel name. */
export function generateAvatarDataUrl(name: string): string {
  const cached = avatarCache.get(name)
  if (cached) return cached
  const h = fnv1a(name)
  const hue = h % 360
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="32" fill="hsl(${hue}, 58%, 46%)"/>` +
    `<text x="32" y="43" font-size="30" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif">${esc(initial)}</text>` +
    `</svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  avatarCache.set(name, url)
  return url
}

/** Gradient placeholder shown when a candidate has no cover set. */
export function makePlaceholderThumb(text = '未设置封面'): string {
  const key = `placeholder:${text}`
  return generateMockThumbDataUrl(key, text)
}

/** Consistent accent color derived from a name (used for generated avatars in the tool chrome). */
export function colorFromName(name: string): string {
  return `hsl(${fnv1a(name) % 360}, 55%, 45%)`
}

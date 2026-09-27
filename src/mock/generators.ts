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

// ---------------------------------------------------------------------------
// 我的世界分区专用: 像素方块风封面(草方块绿/泥土棕/石头灰色调 + 像素网格)
// ---------------------------------------------------------------------------

const MC_SKIES: Array<[string, string]> = [
  ['#7ec0ee', '#4a8ed0'],
  ['#8fbc5a', '#4f7942'],
  ['#2c3e50', '#1a2634'],
  ['#f8b26a', '#e07b39'],
  ['#6d4c35', '#3e2c20'],
]

const MC_BLOCKS = ['#7cb342', '#558b2f', '#8d6e63', '#6d4c41', '#9e9e9e', '#757575', '#4caf50', '#2e7d32', '#d4a24e', '#795548']

const mcCache = new Map<string, string>()

/** 像素方块风格封面: 24×13 的低分辨率方块噪声 + 粗描边大字,模拟 MC 区常见的实况截图风 */
export function generateMcThumbDataUrl(id: string, title: string): string {
  const cached = mcCache.get(id)
  if (cached) return cached
  const h = fnv1a(id)
  const [sky1, sky2] = MC_SKIES[h % MC_SKIES.length]
  const kw = shortenTitle(title)

  const cols = 24
  const rows = 13
  const cell = 640 / cols
  let blocks = ''
  let seed = h
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0xffffffff
  }
  for (let y = 6; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const pick = MC_BLOCKS[Math.floor(rand() * MC_BLOCKS.length)]
      const shade = 0.55 + rand() * 0.45
      const [r, g, b] = [parseInt(pick.slice(1, 3), 16), parseInt(pick.slice(3, 5), 16), parseInt(pick.slice(5, 7), 16)]
      blocks += `<rect x="${(x * cell).toFixed(1)}" y="${(y * cell).toFixed(1)}" width="${cell + 0.5}" height="${cell + 0.5}" fill="rgb(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)})"/>`
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="640" height="360" fill="url(#sky)"/>` +
    blocks +
    `<text x="32" y="296" font-size="58" font-weight="700" fill="#ffffff" stroke="rgba(0,0,0,0.55)" stroke-width="10" paint-order="stroke" font-family="'PingFang SC','Microsoft YaHei',sans-serif" transform="rotate(-2 32 296)">${esc(kw)}</text>` +
    `</svg>`

  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  mcCache.set(id, url)
  return url
}

/** Consistent accent color derived from a name (used for generated avatars in the tool chrome). */
export function colorFromName(name: string): string {
  return `hsl(${fnv1a(name) % 360}, 55%, 45%)`
}

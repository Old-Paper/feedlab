#!/usr/bin/env node
// 每日真实封面池抓取脚本 —— 由 GitHub Actions 每天定时执行一次(UTC 01:00 / 北京 09:00)。
// 从 YouTube 与 Bilibili 抓取"最火 + 不太火"两组真实视频的封面/标题/元数据,
// 生成 public/data/coverPool.json;当天不再变化,第二天由下一次定时任务覆盖。
// 手动本地运行: node scripts/fetch-covers.mjs

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

const OUT = 'public/data/coverPool.json'
const HOT_N = 16
const LOW_N = 16
const TIMEOUT = 15000

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

async function timedFetch(url, headers = {}, as = 'json') {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8', ...headers },
      signal: ctrl.signal,
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return as === 'json' ? await res.json() : await res.text()
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Bilibili(官方公开接口,无需登录)
// ---------------------------------------------------------------------------

function mapBili(v, i) {
  const pub = v.pubdate ?? v.publish_time ?? 0
  return {
    id: `bili-${v.bvid ?? v.aid ?? i}`,
    title: v.title ?? '',
    channel: v.owner?.name ?? '',
    views: v.stat?.view ?? 0,
    danmaku: v.stat?.danmaku ?? 0,
    durationSec: v.duration ?? 0,
    publishedHoursAgo: pub ? Math.max(1, Math.round((Date.now() / 1000 - pub) / 3600)) : 48,
    pic: (v.pic ?? '').replace(/^http:/, 'https:'),
  }
}

async function fetchBilibili() {
  const hot = []
  const low = []
  const headers = { Referer: 'https://www.bilibili.com/' }
  // 最火: 综合热门第 1 页头部(百万级播放)
  try {
    const popular = await timedFetch('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1', headers)
    if (popular?.code !== 0) throw new Error(`popular code=${popular?.code}`)
    const list = popular.data?.list ?? []
    for (const v of list.slice(0, HOT_N)) hot.push(mapBili(v, hot.length))
  } catch (e) {
    console.warn('[bili] hot failed:', e.message)
  }
  // 不太火: 综合热门深页(第 3 页)里播放量最低的一段 —— 通常在几万量级,比头部低 1-2 个数量级
  try {
    const deep = await timedFetch('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=3', headers)
    if (deep?.code !== 0) throw new Error(`popular deep code=${deep?.code}`)
    const list = [...(deep.data?.list ?? [])].sort((a, b) => (a.stat?.view ?? 0) - (b.stat?.view ?? 0))
    for (const v of list.slice(0, LOW_N)) low.push(mapBili(v, low.length))
  } catch (e) {
    console.warn('[bili] low failed:', e.message)
  }
  return { hot, low }
}

// ---------------------------------------------------------------------------
// YouTube(无 API Key,解析页面内嵌 ytInitialData)
// ---------------------------------------------------------------------------

/** 从 HTML 中截取 ytInitialData = {...}; 的完整 JSON(花括号配对,支持字符串转义) */
function extractYtInitialData(html) {
  const key = 'ytInitialData'
  let i = html.indexOf(key)
  while (i !== -1) {
    const start = html.indexOf('{', i)
    if (start === -1) return null
    let depth = 0
    let inStr = false
    let esc = false
    let end = -1
    for (let j = start; j < html.length; j++) {
      const c = html[j]
      if (inStr) {
        if (esc) esc = false
        else if (c === '\\') esc = true
        else if (c === '"') inStr = false
        continue
      }
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          end = j + 1
          break
        }
      }
    }
    if (end === -1) return null
    try {
      return JSON.parse(html.slice(start, end))
    } catch {
      i = html.indexOf(key, end)
    }
  }
  return null
}

function collectVideoRenderers(node, out, seen) {
  if (!node || typeof node !== 'object' || seen.has(node)) return
  seen.add(node)
  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out, seen)
    return
  }
  // 旧结构(搜索页)与新结构(trending 2025+)并存
  if (node.videoRenderer) out.push({ kind: 'video', r: node.videoRenderer })
  if (node.lockupViewModel && node.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
    out.push({ kind: 'lockup', r: node.lockupViewModel })
  }
  for (const k of Object.keys(node)) collectVideoRenderers(node[k], out, seen)
}

/** 解析新版 lockupViewModel(trending 页) */
function mapYtLockup(vm) {
  const meta = vm.metadata?.lockupMetadataViewModel
  const title = meta?.title?.content ?? ''
  let channel = ''
  let views = null
  let ago = null
  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows ?? []
  for (const row of rows) {
    for (const part of row.metadataParts ?? []) {
      const t = part?.text?.content ?? ''
      if (!t) continue
      if (/view/i.test(t)) views = parseViewsEn(t)
      else if (/ago|Streamed|Premiere/i.test(t)) ago = parseAgoEn(t)
      else if (!channel) channel = t
    }
  }
  const badges = (vm.contentImage?.thumbnailViewModel?.overlays ?? [])
    .flatMap((o) => o?.thumbnailOverlayBadgeViewModel?.thumbnailBadges ?? [])
    .map((b) => b?.thumbnailBadgeViewModel?.text)
    .filter(Boolean)
  const durText = badges.find((t) => /^\d+(:\d+)+$/.test(t))
  return {
    id: `yt-${vm.contentId}`,
    title,
    channel,
    views: views ?? 0,
    durationSec: parseDurationEn(durText ?? null) ?? 0,
    publishedHoursAgo: ago ?? 48,
    pic: `https://i.ytimg.com/vi/${vm.contentId}/hq720.jpg`,
  }
}

function parseViewsEn(text) {
  if (!text) return null
  if (/no views/i.test(text)) return 0
  const zh = text.match(/([\d.]+)\s*万/) ?? text.match(/([\d.]+)\s*亿/)
  if (zh) return Math.round(parseFloat(zh[1]) * (text.includes('亿') ? 1e8 : 1e4))
  const en = text.match(/([\d.,]+)\s*([KMB]?)\s*(?:views|次观看)?/i)
  if (!en) return null
  let n = parseFloat(en[1].replace(/,/g, ''))
  if (!Number.isFinite(n)) return null
  const suffix = (en[2] ?? '').toUpperCase()
  if (suffix === 'K') n *= 1e3
  if (suffix === 'M') n *= 1e6
  if (suffix === 'B') n *= 1e9
  return Math.round(n)
}

function parseDurationEn(text) {
  if (!text) return null
  const parts = text.split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => !Number.isFinite(p))) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

function parseAgoEn(text) {
  if (!text) return null
  const m = text.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i)
  if (!m) return /just now|streamed/i.test(text) ? 24 : null
  const n = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  const hours = { minute: 1 / 60, hour: 1, day: 24, week: 168, month: 720, year: 8760 }
  return Math.max(1, Math.round(n * (hours[unit] ?? 24)))
}

function mapYt(r) {
  const title = r.title?.runs?.[0]?.text ?? r.title?.simpleText ?? ''
  const channel =
    r.ownerText?.runs?.[0]?.text ?? r.longBylineText?.runs?.[0]?.text ?? r.shortBylineText?.runs?.[0]?.text ?? ''
  const views =
    parseViewsEn(r.viewCountText?.simpleText) ?? parseViewsEn(r.shortViewCountText?.simpleText) ?? 0
  return {
    id: `yt-${r.videoId}`,
    title,
    channel,
    views,
    durationSec: parseDurationEn(r.lengthText?.simpleText) ?? 0,
    publishedHoursAgo: parseAgoEn(r.publishedTimeText?.simpleText) ?? 48,
    pic: `https://i.ytimg.com/vi/${r.videoId}/hq720.jpg`,
  }
}

const YT_HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+419; SOCS=CAI',
}

async function verifyPic(entry) {
  // hq720 对部分视频不存在,校验失败时退回必定存在的 mqdefault (320x180, 16:9)
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(entry.pic, { method: 'HEAD', signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) entry.pic = entry.pic.replace('hq720', 'mqdefault')
  } catch {
    entry.pic = entry.pic.replace('hq720', 'mqdefault')
  }
  return entry
}

async function fetchYouTube() {
  const hot = []
  const low = []
  const toEntry = (item) => (item.kind === 'lockup' ? mapYtLockup(item.r) : mapYt(item.r))
  try {
    const html = await timedFetch('https://www.youtube.com/feed/trending', YT_HEADERS, 'text')
    const data = extractYtInitialData(html)
    if (!data) throw new Error('ytInitialData not found (consent page?)')
    const items = []
    collectVideoRenderers(data, items, new Set())
    const nVideo = items.filter((i) => i.kind === 'video').length
    const nLockup = items.filter((i) => i.kind === 'lockup').length
    console.warn(`[yt] hot debug: htmlLen=${html.length} items=${items.length} video=${nVideo} lockup=${nLockup}`)
    if (items[0]) {
      const sample = items[0].kind === 'lockup' ? mapYtLockup(items[0].r) : mapYt(items[0].r)
      console.warn(`[yt] hot sample: ${JSON.stringify(sample).slice(0, 220)}`)
    }
    const seen = new Set()
    for (const item of items) {
      if (hot.length >= HOT_N) break
      const mapped = toEntry(item)
      if (!mapped.title || !mapped.channel || mapped.durationSec <= 0) continue
      if (seen.has(mapped.id)) continue
      seen.add(mapped.id)
      hot.push(mapped)
    }
  } catch (e) {
    console.warn('[yt] hot failed:', e.message)
  }
  // trending 解析失败时的兜底: 公共 Piped 实例的 trending 接口
  if (hot.length < 4) {
    const instances = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://api.piped.private.coffee']
    for (const base of instances) {
      if (hot.length >= 4) break
      try {
        const list = await timedFetch(`${base}/trending?region=US`, {})
        if (!Array.isArray(list) || list.length === 0) continue
        for (const it of list) {
          if (hot.length >= HOT_N) break
          const videoId = String(it.url ?? '').split('v=')[1] ?? ''
          if (!videoId) continue
          hot.push({
            id: `yt-${videoId}`,
            title: it.title ?? '',
            channel: it.uploaderName ?? '',
            views: it.views ?? 0,
            durationSec: it.duration ?? 0,
            publishedHoursAgo: it.uploaded ? Math.max(1, Math.round((Date.now() - it.uploaded) / 3600000)) : 48,
            pic: `https://i.ytimg.com/vi/${videoId}/hq720.jpg`,
          })
        }
      } catch (e) {
        console.warn(`[yt] piped ${base} failed:`, e.message)
      }
    }
  }
  // 不太火: 按上传时间排序的搜索结果,只保留播放量 < 5万 的视频
  const keywords = ['minecraft', 'cooking', 'tech review', 'vlog', 'study', 'diy']
  const seen = new Set(hot.map((h) => h.id))
  for (const kw of keywords) {
    if (low.length >= LOW_N) break
    try {
      const html = await timedFetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}&sp=CAI`,
        YT_HEADERS,
        'text',
      )
      const data = extractYtInitialData(html)
      if (!data) continue
      const items = []
      collectVideoRenderers(data, items, new Set())
      for (const item of items) {
        if (low.length >= LOW_N) break
        const mapped = toEntry(item)
        if (!mapped.title || !mapped.channel || mapped.durationSec <= 0) continue
        if (mapped.views > 50000) continue
        if (seen.has(mapped.id)) continue
        seen.add(mapped.id)
        low.push(mapped)
      }
    } catch (e) {
      console.warn(`[yt] low "${kw}" failed:`, e.message)
    }
  }
  return { hot, low }
}

// ---------------------------------------------------------------------------

async function main() {
  const [bilibili, youtube] = await Promise.all([fetchBilibili(), fetchYouTube()])

  // 校验封面 URL 可用性(失败退回兜底尺寸)
  await Promise.all([
    ...bilibili.hot.map(verifyPic),
    ...bilibili.low.map(verifyPic),
    ...youtube.hot.map(verifyPic),
    ...youtube.low.map(verifyPic),
  ])

  const pool = {
    generatedAt: new Date().toISOString(),
    bilibili,
    youtube,
  }

  const json = JSON.stringify(pool)
  if (existsSync(OUT)) {
    try {
      if (JSON.parse(readFileSync(OUT, 'utf8')).generatedAt === pool.generatedAt) {
        console.log('unchanged, skip write')
        return
      }
    } catch {
      // 文件损坏则重写
    }
  }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, json)
  console.log(
    `cover pool written: bilibili hot=${bilibili.hot.length} low=${bilibili.low.length} | ` +
      `youtube hot=${youtube.hot.length} low=${youtube.low.length}`,
  )
}

main().catch((e) => {
  console.error('fetch-covers failed:', e)
  process.exit(1)
})

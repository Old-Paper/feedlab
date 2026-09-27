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
// Bilibili(官方公开接口;搜索需要 wbi 签名 —— 公开算法,无需登录)
// ---------------------------------------------------------------------------

const crypto = await import('node:crypto')
const MIXIN_TAB = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52]
const BILI_COOKIE = 'buvid3=' + crypto.randomUUID().toUpperCase() + 'infoc'

function encWbi(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function wbiSign(params, imgKey, subKey) {
  const mixin = (imgKey + subKey)
    .split('')
    .map((_, i) => (imgKey + subKey)[MIXIN_TAB[i]])
    .join('')
    .slice(0, 32)
  const wts = Math.floor(Date.now() / 1000)
  const p = { ...params, wts }
  const qs = Object.keys(p)
    .sort()
    .map((k) => encWbi(k) + '=' + encWbi(String(p[k])))
    .join('&')
  const w_rid = crypto.createHash('md5').update(qs + mixin).digest('hex')
  return `${qs}&w_rid=${w_rid}`
}

async function biliSearch(keyword, page) {
  // 未登录时 nav 返回 code=-101,但 wbi_img 密钥仍然有效
  const nav = await timedFetch('https://api.bilibili.com/x/web-interface/nav', {
    Referer: 'https://www.bilibili.com/',
    Cookie: BILI_COOKIE,
  })
  const imgKey = nav?.data?.wbi_img?.img_url?.split('/')?.pop()?.split('.')?.[0]
  const subKey = nav?.data?.wbi_img?.sub_url?.split('/')?.pop()?.split('.')?.[0]
  if (!imgKey || !subKey) throw new Error(`nav wbi keys missing (code=${nav?.code})`)
  const qs = wbiSign({ search_type: 'video', keyword, page, page_size: 30 }, imgKey, subKey)
  const res = await timedFetch(
    `https://api.bilibili.com/x/web-interface/search/type?${qs}`,
    { Referer: 'https://www.bilibili.com/', Cookie: BILI_COOKIE },
  )
  if (res?.code !== 0) throw new Error(`search code=${res?.code}`)
  return (res.data?.result ?? []).filter((r) => r.type === 'video')
}

function parseBiliDuration(text) {
  const parts = String(text ?? '').split(':').map((n) => parseInt(n, 10))
  if (parts.some((n) => !Number.isFinite(n))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function mapBiliSearch(r) {
  const pub = r.pubdate ?? 0
  return {
    id: `bili-${r.bvid ?? r.aid}`,
    title: String(r.title ?? '').replace(/<[^>]+>/g, ''),
    channel: r.author ?? '',
    views: r.play ?? 0,
    danmaku: r.video_review ?? 0,
    durationSec: parseBiliDuration(r.duration),
    publishedHoursAgo: pub ? Math.max(1, Math.round((Date.now() / 1000 - pub) / 3600)) : 48,
    pic: (r.pic ?? '').replace(/^http:/, 'https:'),
  }
}

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
  const mcSeenBili = new Set()
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
  // 我的世界分区: wbi 签名搜索「我的世界」,相关度排序头部(最火 MC)+ 低播放腰部
  const minecraft = []
  try {
    const seenMc = new Set()
    const searchResults = [
      ...(await biliSearch('我的世界', 1)),
      ...(await biliSearch('我的世界', 2)),
    ]
    const mapped = searchResults.map(mapBiliSearch).filter((v) => v.title && v.durationSec > 0)
    for (const v of [...mapped].sort((a, b) => b.views - a.views)) {
      if (minecraft.length >= 10) break
      if (mcSeenBili.has(v.id)) continue
      mcSeenBili.add(v.id)
      minecraft.push(v)
    }
    for (const v of [...mapped].sort((a, b) => a.views - b.views)) {
      if (minecraft.length >= LOW_N) break
      if (v.views > 50000) continue
      if (mcSeenBili.has(v.id)) continue
      mcSeenBili.add(v.id)
      minecraft.push(v)
    }
  } catch (e) {
    console.warn('[bili] minecraft failed:', e.message)
  }
  return { hot, low, minecraft }
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
  const seen = new Set()
  const parsePage = async (url) => {
    const toEntry = (item) => (item.kind === 'lockup' ? mapYtLockup(item.r) : mapYt(item.r))
    const html = await timedFetch(url, YT_HEADERS, 'text')
    const data = extractYtInitialData(html)
    if (!data) return []
    const items = []
    collectVideoRenderers(data, items, new Set())
    return items.map(toEntry)
  }
  // 最火: trending 页对未登录服务器请求不内嵌视频数据,改用大众关键词默认排序
  // (相关度)的搜索结果 —— 首屏几乎全是百万级播放的视频,取 views >= 200万 的条目
  const hotKeywords = ['minecraft', 'music video', 'gaming', 'news', 'cooking', 'science']
  for (const kw of hotKeywords) {
    if (hot.length >= HOT_N) break
    try {
      const entries = await parsePage(`https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}`)
      let taken = 0
      for (const mapped of entries) {
        if (hot.length >= HOT_N || taken >= 3) break
        if (!mapped.title || !mapped.channel || mapped.durationSec <= 0) continue
        if (mapped.views < 2000000) continue
        if (seen.has(mapped.id)) continue
        seen.add(mapped.id)
        hot.push(mapped)
        taken += 1
      }
    } catch (e) {
      console.warn(`[yt] hot "${kw}" failed:`, e.message)
    }
  }
  // 兜底: 公共 Piped 实例的 trending 接口
  if (hot.length < 4) {
    const instances = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://api.piped.private.coffee']
    for (const base of instances) {
      if (hot.length >= 4) break
      try {
        const list = await timedFetch(`${base}/trending?region=US`, {})
        if (!Array.isArray(list) || list.length === 0) continue
        for (const it of list) {
          const videoId = String(it.url ?? '').split('v=')[1] ?? ''
          if (!videoId) continue
          if ((it.isLive ?? it.livestream) === true) continue
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
    hot.sort((a, b) => b.views - a.views)
    hot.length = Math.min(hot.length, HOT_N)
    console.warn(`[yt] hot fallback (piped): ${hot.length}`)
  }
  // 不太火: 按上传时间排序的搜索结果,只保留播放量 < 5万 的视频
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const keywords = ['minecraft', 'cooking', 'tech review', 'vlog', 'study', 'diy', 'gaming', 'travel', 'fishing', 'craft']
  for (const kw of keywords) {
    if (low.length >= LOW_N) break
    let entries = null
    for (let attempt = 0; attempt < 2 && entries === null; attempt++) {
      await sleep(900)
      try {
        entries = await parsePage(`https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}&sp=CAI`)
      } catch (e) {
        entries = null
      }
    }
    if (entries === null) {
      console.warn(`[yt] low "${kw}" failed`)
      continue
    }
    let taken = 0
    for (const mapped of entries) {
      if (low.length >= LOW_N || taken >= 4) break
      if (!mapped.title || !mapped.channel || mapped.durationSec <= 0) continue
      if (mapped.views > 50000) continue
      if (seen.has(mapped.id)) continue
      seen.add(mapped.id)
      low.push(mapped)
      taken += 1
    }
  }
  // 我的世界分区: 默认排序搜索取高播放(>=30万) + 按上传时间排序取低播放(<5万)
  const minecraft = []
  try {
    const mcSeen = new Set()
    const hotEntries = await parsePage('https://www.youtube.com/results?search_query=minecraft')
    for (const mapped of hotEntries) {
      if (minecraft.length >= 10) break
      if (!mapped.title || !mapped.channel || mapped.durationSec <= 0) continue
      if (mapped.views < 300000) continue
      if (mcSeen.has(mapped.id)) continue
      mcSeen.add(mapped.id)
      minecraft.push(mapped)
    }
    const lowEntries = await parsePage('https://www.youtube.com/results?search_query=minecraft&sp=CAI')
    let taken = 0
    for (const mapped of lowEntries) {
      if (minecraft.length >= LOW_N || taken >= 8) break
      if (!mapped.title || !mapped.channel || mapped.durationSec <= 0) continue
      if (mapped.views > 50000) continue
      if (mcSeen.has(mapped.id)) continue
      mcSeen.add(mapped.id)
      minecraft.push(mapped)
      taken += 1
    }
  } catch (e) {
    console.warn('[yt] minecraft failed:', e.message)
  }
  return { hot, low, minecraft }
}

// ---------------------------------------------------------------------------

async function main() {
  const [bilibili, youtube] = await Promise.all([fetchBilibili(), fetchYouTube()])

  // 校验封面 URL 可用性(失败退回兜底尺寸)
  await Promise.all([
    ...bilibili.hot.map(verifyPic),
    ...bilibili.low.map(verifyPic),
    ...bilibili.minecraft.map(verifyPic),
    ...youtube.hot.map(verifyPic),
    ...youtube.low.map(verifyPic),
    ...youtube.minecraft.map(verifyPic),
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
    `cover pool written: bilibili hot=${bilibili.hot.length} low=${bilibili.low.length} mc=${bilibili.minecraft.length} | ` +
      `youtube hot=${youtube.hot.length} low=${youtube.low.length} mc=${youtube.minecraft.length}`,
  )
}

main().catch((e) => {
  console.error('fetch-covers failed:', e)
  process.exit(1)
})

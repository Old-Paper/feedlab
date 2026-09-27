import { useEffect, useState } from 'react'
import type { DistractorCategory, MockVideo, Platform } from '../types'

// 每日真实封面池 —— 由 GitHub Actions 每天定时运行 scripts/fetch-covers.mjs 生成一次,
// 静态托管在 /data/coverPool.json;当天所有访客使用同一份数据,次日由定时任务覆盖。
// 每个平台包含 hot(全站最火)与 low(不太火)两组,模拟真实推荐流的播放量分布。

export interface PoolEntry {
  id: string
  title: string
  channel: string
  views: number
  danmaku?: number
  durationSec: number
  publishedHoursAgo: number
  pic: string
}

interface CoverPoolFile {
  generatedAt: string
  bilibili: { hot: PoolEntry[]; low: PoolEntry[]; minecraft?: PoolEntry[] }
  youtube: { hot: PoolEntry[]; low: PoolEntry[]; minecraft?: PoolEntry[] }
}

let cachedFile: CoverPoolFile | null | undefined
let inflight: Promise<CoverPoolFile | null> | null = null

async function loadCoverPoolFile(): Promise<CoverPoolFile | null> {
  if (cachedFile !== undefined) return cachedFile
  if (!inflight) {
    inflight = fetch(`${import.meta.env.BASE_URL}data/coverPool.json`)
      .then(async (res) => {
        const file = res.ok ? ((await res.json()) as CoverPoolFile) : null
        cachedFile = file ?? null
        return cachedFile
      })
      .catch(() => {
        cachedFile = null
        return null
      })
      .finally(() => {
        inflight = null
      })
  }
  return await inflight
}

export function poolToMockVideos(platform: Platform, file: CoverPoolFile, category: DistractorCategory = 'normal'): MockVideo[] {
  const bucket = platform === 'youtube' ? file.youtube : file.bilibili
  const list =
    category === 'minecraft'
      ? [...(bucket?.minecraft ?? [])]
      : [...(bucket?.hot ?? []), ...(bucket?.low ?? [])]
  const entries = list
  return entries.map((e) => ({
    id: `pool-${platform}-${e.id}`,
    title: e.title,
    channel: e.channel || '未知频道',
    views: e.views,
    danmaku: e.danmaku,
    durationSec: e.durationSec || 300,
    publishedHoursAgo: e.publishedHoursAgo || 48,
    thumbSrcUrl: e.pic,
    custom: true,
    enabled: true,
  }))
}

/**
 * 加载当前平台的真实封面池。enabled=false 或文件缺失/对应平台为空时返回 null,
 * 生成器会自动回退到内置干扰视频库。
 */
export function useCoverPool(platform: Platform, enabled: boolean, category: DistractorCategory = 'normal'): MockVideo[] | null {
  const [pool, setPool] = useState<MockVideo[] | null>(null)

  useEffect(() => {
    if (!enabled) {
      setPool(null)
      return
    }
    let alive = true
    void loadCoverPoolFile().then((file) => {
      if (!alive) return
      setPool(file ? poolToMockVideos(platform, file, category) : null)
    })
    return () => {
      alive = false
    }
  }, [platform, enabled, category])

  return pool
}

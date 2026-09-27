import type {
  Candidate,
  FeedVideo,
  GeneratedFeed,
  MockVideo,
  Platform,
  Project,
  TestSettings,
} from '../../types'
import { BUILTIN_MOCK_VIDEOS } from '../../mock/builtinMockVideos'
import { RandomEngine, jitterInt } from './randomEngine'

export interface FeedOptions {
  platform: Platform
  mockCount: number
  randomizeFeedOrder: boolean
  randomizeMetadata: boolean
  /**
   * 每日真实封面池(按平台)。提供且数量足够时,替代内置干扰视频 ——
   * 覆盖"最火 + 不太火"两组真实视频,由 fetch-covers 每日更新一次。
   */
  poolVideos?: MockVideo[]
}

export interface FeedRequest {
  project: Project
  options: FeedOptions
  candidate: Candidate | null
  seed: string
  /**
   * 0-based candidate slot. When omitted, it is derived deterministically
   * from the seed — which is what makes A/B environments line up.
   */
  position?: number | null
}

export function collectMockPool(project: Project, poolVideos?: MockVideo[]): MockVideo[] {
  if (poolVideos && poolVideos.length >= 4) return poolVideos
  const disabled = new Set(project.disabledBuiltinMockIds)
  const builtin = BUILTIN_MOCK_VIDEOS.filter((m) => !disabled.has(m.id))
  const custom = project.mockVideos.filter((m) => m.enabled)
  return [...builtin, ...custom]
}

function candidateChannelName(project: Project, platform: Platform): string {
  const ch = project.channel
  if (platform === 'youtube') return ch.youtube.channelName || ch.name || '我的频道'
  return ch.bilibili.uploaderName || ch.name || '我的频道'
}

function baseChannelMetadata(project: Project, platform: Platform) {
  const ch = project.channel
  return platform === 'youtube'
    ? {
        views: ch.youtube.views,
        danmaku: undefined as number | undefined,
        durationSec: ch.youtube.durationSec,
        publishedHoursAgo: ch.youtube.publishedHoursAgo,
      }
    : {
        views: ch.bilibili.views,
        danmaku: ch.bilibili.danmaku as number | undefined,
        durationSec: ch.bilibili.durationSec,
        publishedHoursAgo: ch.bilibili.publishedHoursAgo,
      }
}

export function resolveCandidateVideo(
  project: Project,
  candidate: Candidate,
  options: FeedOptions,
  rng: RandomEngine,
): FeedVideo {
  const thumbnail = project.thumbnails.find((t) => t.id === candidate.thumbnailId) ?? null
  const title = project.titles.find((t) => t.id === candidate.titleId) ?? null
  const base = baseChannelMetadata(project, options.platform)
  const ov = candidate.metadata

  let views = ov.views ?? base.views
  let danmaku = ov.danmaku ?? base.danmaku
  let durationSec = ov.durationSec ?? base.durationSec
  let publishedHoursAgo = ov.publishedHoursAgo ?? base.publishedHoursAgo

  if (options.randomizeMetadata) {
    views = jitterInt(rng, views, 0.5, 2)
    publishedHoursAgo = jitterInt(rng, publishedHoursAgo, 0.5, 1.5)
    if (danmaku !== undefined) danmaku = jitterInt(rng, danmaku, 0.5, 2)
    durationSec = Math.max(15, Math.round(durationSec * rng.range(0.6, 1.4)))
  }

  return {
    id: `candidate:${candidate.id}`,
    kind: 'candidate',
    candidateId: candidate.id,
    title: title?.text ?? '(未设置标题)',
    channel: candidateChannelName(project, options.platform),
    thumbAssetId: thumbnail?.assetId,
    thumbCrop: thumbnail?.crop,
    sourceWidth: thumbnail?.width,
    sourceHeight: thumbnail?.height,
    avatarAssetId: project.channel.avatarAssetId ?? undefined,
    avatarName: candidateChannelName(project, options.platform),
    views,
    danmaku,
    durationSec,
    publishedHoursAgo,
  }
}

function toMockFeedVideo(mv: MockVideo, index: number, rng: RandomEngine, randomize: boolean): FeedVideo {
  let views = mv.views
  let danmaku = mv.danmaku
  let publishedHoursAgo = mv.publishedHoursAgo
  if (randomize) {
    views = jitterInt(rng, mv.views, 0.5, 2)
    publishedHoursAgo = jitterInt(rng, mv.publishedHoursAgo, 0.5, 1.5)
    if (danmaku !== undefined) danmaku = jitterInt(rng, danmaku, 0.5, 2)
  }
  return {
    id: `mock:${mv.id}:${index}`,
    kind: 'mock',
    title: mv.title,
    channel: mv.channel,
    thumbAssetId: mv.thumbAssetId,
    thumbSrc: mv.thumbAssetId ? undefined : (mv.thumbSrcUrl ?? mockInlineThumb(mv)),
    avatarName: mv.channel,
    views,
    danmaku,
    durationSec: mv.durationSec,
    publishedHoursAgo,
  }
}

import { builtinMockThumb } from '../../mock/builtinMockVideos'
import { generateMockThumbDataUrl } from '../../mock/generators'

function mockInlineThumb(mv: MockVideo): string {
  return mv.custom ? generateMockThumbDataUrl(`custom:${mv.id}`, mv.title) : builtinMockThumb(mv.id, mv.title)
}

/** Deterministic candidate slot derived from the seed (used when no explicit position is given). */
export function derivePosition(seed: string, totalSlots: number): number {
  return new RandomEngine(`${seed}#position`).int(0, Math.max(totalSlots, 1))
}

export function generateFeed(req: FeedRequest): GeneratedFeed {
  const { project, options, seed } = req
  const pool = collectMockPool(project, options.poolVideos).slice().sort((a, b) => (a.id < b.id ? -1 : 1))

  const rng = new RandomEngine(seed)
  const wanted = Math.max(0, Math.round(options.mockCount))
  const picks =
    options.randomizeFeedOrder && pool.length > 0 ? rng.shuffle(pool) : pool.slice()
  const selected: MockVideo[] = picks.slice(0, wanted)
  // Pool smaller than the requested count: repeat entries with unique ids.
  while (selected.length < wanted && pool.length > 0) {
    selected.push(pool[selected.length % pool.length])
  }

  const hasCandidate = req.candidate !== null
  const totalSlots = selected.length + (hasCandidate ? 1 : 0)
  const position =
    req.position != null
      ? Math.min(Math.max(req.position, 0), Math.max(totalSlots - 1, 0))
      : derivePosition(seed, totalSlots)

  const items: FeedVideo[] = []
  let candidateIndex = -1
  let mockCursor = 0
  for (let i = 0; i < totalSlots; i++) {
    if (hasCandidate && i === position && req.candidate) {
      items.push(resolveCandidateVideo(project, req.candidate, options, rng))
      candidateIndex = i
    } else {
      items.push(toMockFeedVideo(selected[mockCursor], i, rng, options.randomizeMetadata))
      mockCursor += 1
    }
  }

  return { items, candidateIndex, seed }
}

export function candidateById(project: Project, id: string | null | undefined): Candidate | null {
  if (!id) return null
  return project.candidates.find((c) => c.id === id) ?? null
}

export function enabledCandidates(project: Project): Candidate[] {
  return project.candidates.filter((c) => c.enabled)
}

export interface TestEnvSnapshot {
  platform: Platform
  device: TestSettings['device']
  viewportWidth: number
  viewportHeight: number
  theme: TestSettings['theme']
}

export function testEnvFromSettings(settings: TestSettings): TestEnvSnapshot {
  return {
    platform: settings.platform,
    device: settings.device,
    viewportWidth: settings.viewportWidth,
    viewportHeight: settings.viewportHeight,
    theme: settings.theme,
  }
}

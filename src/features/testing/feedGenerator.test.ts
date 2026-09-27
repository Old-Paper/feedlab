import { describe, expect, it } from 'vitest'
import { derivePosition, generateFeed } from './feedGenerator'
import type { Candidate, ChannelProfile, MockVideo, Platform, Project, TestSettings } from '../../types'

function makeThumbnail(id: string, name: string): Project['thumbnails'][number] {
  return {
    id,
    name,
    assetId: `asset-${id}`,
    width: 1280,
    height: 720,
    createdAt: 0,
    order: 0,
    crop: {
      'youtube-desktop': { zoom: 1.25, x: 0.3, y: -0.2 },
      'youtube-mobile': { zoom: 1, x: 0, y: 0 },
      'bilibili-desktop': { zoom: 1, x: 0, y: 0 },
      'bilibili-mobile': { zoom: 1, x: 0, y: 0 },
    },
  }
}

function makeCandidate(id: string, thumbnailId: string, titleId: string, name: string): Candidate {
  return {
    id,
    name,
    thumbnailId,
    titleId,
    enabled: true,
    createdAt: 0,
    metadata: {},
  }
}

function makeProject(): Project {
  const t1 = makeThumbnail('thumb-1', '封面1')
  const t2 = makeThumbnail('thumb-2', '封面2')
  const ti1 = { id: 'title-1', text: '我在全是岩浆的世界生存了100天', order: 0, createdAt: 0 }
  const ti2 = { id: 'title-2', text: 'Minecraft但是整个世界都是岩浆', order: 1, createdAt: 0 }
  const channel: ChannelProfile = {
    name: '测试频道',
    avatarAssetId: null,
    youtube: { channelName: 'Test Channel', views: 128000, danmaku: 0, durationSec: 615, publishedHoursAgo: 26 },
    bilibili: { uploaderName: '测试UP', views: 96000, danmaku: 2100, durationSec: 542, publishedHoursAgo: 20 },
    metadataMode: 'fixed',
  }
  const testSettings: TestSettings = {
    platform: 'youtube',
    device: 'desktop',
    theme: 'light',
    viewportPresetId: '1920x1080',
    viewportWidth: 1920,
    viewportHeight: 1080,
    mockCount: 12,
    randomizeFeedOrder: true,
    randomizeMetadata: false,
    positionMode: 'random',
    fixedPosition: 1,
    useFixedSeed: false,
    seed: 'fixture-seed',
    useRealPool: false,
    competitionEnvironment: 'site',
    lockCompetitionEnvironment: false,
    blindDuration: 5,
    rounds: 10,
    candidateScope: 'all',
    singleCandidateId: null,
  }
  return {
    id: 'project-fixture',
    name: '测试项目',
    createdAt: 0,
    updatedAt: 0,
    thumbnails: [t1, t2],
    titles: [ti1, ti2],
    candidates: [
      makeCandidate('cand-A', 'thumb-1', 'title-1', 'A方案'),
      makeCandidate('cand-B', 'thumb-2', 'title-2', 'B方案'),
    ],
    channel,
    testSettings,
    mockVideos: [],
    disabledBuiltinMockIds: [],
  }
}

function countCandidate(items: ReturnType<typeof generateFeed>['items']): number {
  return items.filter((i) => i.kind === 'candidate').length
}

describe('feedGenerator — 候选位置', () => {
  it('Candidate 精确出现在指定 position(0-based)', () => {
    const project = makeProject()
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: false },
      candidate: project.candidates[0],
      seed: 'pos-seed',
      position: 3,
    })
    expect(feed.items).toHaveLength(13)
    expect(feed.items[3].kind).toBe('candidate')
    expect(feed.items[3].candidateId).toBe('cand-A')
    expect(feed.candidateIndex).toBe(3)
  })

  it('Candidate 在整个 Feed 中只出现一次', () => {
    const project = makeProject()
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 20, randomizeFeedOrder: true, randomizeMetadata: false },
      candidate: project.candidates[1],
      seed: 'once-seed',
      position: 7,
    })
    expect(countCandidate(feed.items)).toBe(1)
  })

  it('mock videos 数量正确(mockCount + 1 个 Candidate)', () => {
    const project = makeProject()
    for (const mockCount of [6, 12, 20]) {
      const feed = generateFeed({
        project,
        options: { platform: 'youtube', mockCount, randomizeFeedOrder: true, randomizeMetadata: false },
        candidate: project.candidates[0],
        seed: 'count-seed',
        position: 0,
      })
      expect(feed.items).toHaveLength(mockCount + 1)
      expect(feed.items.filter((i) => i.kind === 'mock')).toHaveLength(mockCount)
    }
  })

  it('position 超出范围时被钳制到最后一个槽位', () => {
    const project = makeProject()
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 6, randomizeFeedOrder: false, randomizeMetadata: false },
      candidate: project.candidates[0],
      seed: 'clamp-seed',
      position: 999,
    })
    expect(feed.candidateIndex).toBe(6) // 6 mocks + candidate - 1
    expect(feed.items[6].kind).toBe('candidate')
  })
})

describe('feedGenerator — 可复现性', () => {
  it('相同 seed 完全复现 Feed 顺序与元数据', () => {
    const project = makeProject()
    const options = { platform: 'youtube' as const, mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: true }
    const a = generateFeed({ project, options, candidate: project.candidates[0], seed: 'repro-seed', position: 4 })
    const b = generateFeed({ project, options, candidate: project.candidates[0], seed: 'repro-seed', position: 4 })
    expect(JSON.stringify(a.items)).toBe(JSON.stringify(b.items))
    expect(b.candidateIndex).toBe(a.candidateIndex)
  })

  it('未显式给出 position 时, 相同 seed 推导出相同位置', () => {
    const project = makeProject()
    const options = { platform: 'youtube' as const, mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: false }
    const a = generateFeed({ project, options, candidate: project.candidates[0], seed: 'derive-seed' })
    const b = generateFeed({ project, options, candidate: project.candidates[0], seed: 'derive-seed' })
    expect(a.candidateIndex).toBe(b.candidateIndex)
  })

  it('不同 seed 改变干扰项顺序', () => {
    const project = makeProject()
    const options = { platform: 'youtube' as const, mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: false }
    const a = generateFeed({ project, options, candidate: null, seed: 'seed-one' })
    const b = generateFeed({ project, options, candidate: null, seed: 'seed-two' })
    expect(JSON.stringify(a.items.map((i) => i.title))).not.toBe(JSON.stringify(b.items.map((i) => i.title)))
  })

  it('derivePosition 与 seed 绑定且落在合法范围', () => {
    for (const seed of ['p1', 'p2', 'p3']) {
      const pos = derivePosition(seed, 13)
      expect(pos).toBeGreaterThanOrEqual(0)
      expect(pos).toBeLessThan(13)
      expect(derivePosition(seed, 13)).toBe(pos)
    }
  })
})

describe('feedGenerator — Candidate 元数据', () => {
  it('randomizeMetadata 关闭时元数据与配置完全一致(override 优先)', () => {
    const project = makeProject()
    project.candidates[0].metadata = { views: 123456, durationSec: 345, publishedHoursAgo: 30, danmaku: 500 }
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 6, randomizeFeedOrder: false, randomizeMetadata: false },
      candidate: project.candidates[0],
      seed: 'meta-seed',
      position: 0,
    })
    const candidate = feed.items[0]
    expect(candidate.views).toBe(123456)
    expect(candidate.durationSec).toBe(345)
    expect(candidate.publishedHoursAgo).toBe(30)
    expect(candidate.title).toBe('我在全是岩浆的世界生存了100天')
    expect(candidate.channel).toBe('Test Channel')
  })

  it('randomizeMetadata 开启时元数据仍为有限合理值, 不会异常变化', () => {
    const project = makeProject()
    project.candidates[0].metadata = { views: 123456, durationSec: 345, publishedHoursAgo: 30, danmaku: 500 }
    for (const seed of ['jitter-1', 'jitter-2', 'jitter-3']) {
      const feed = generateFeed({
        project,
        options: { platform: 'bilibili', mockCount: 6, randomizeFeedOrder: false, randomizeMetadata: true },
        candidate: project.candidates[0],
        seed,
        position: 0,
      })
      const candidate = feed.items[0]
      expect(Number.isFinite(candidate.views)).toBe(true)
      expect(candidate.views).toBeGreaterThanOrEqual(1)
      expect(Number.isFinite(candidate.durationSec)).toBe(true)
      expect(candidate.durationSec).toBeGreaterThanOrEqual(15)
      expect(Number.isFinite(candidate.publishedHoursAgo)).toBe(true)
      expect(candidate.publishedHoursAgo).toBeGreaterThanOrEqual(1)
      expect(Number.isFinite(candidate.danmaku ?? 0)).toBe(true)
    }
  })
})

describe('feedGenerator — A/B 环境一致性', () => {
  it('相同 seed 下两个 Feed 除 Candidate 外完全一致', () => {
    const project = makeProject()
    const options = { platform: 'youtube' as const, mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: false }
    const seed = 'ab-seed'
    const position = 4
    const feedA = generateFeed({ project, options, candidate: project.candidates[0], seed, position })
    const feedB = generateFeed({ project, options, candidate: project.candidates[1], seed, position })

    expect(feedA.items).toHaveLength(feedB.items.length)
    expect(feedA.candidateIndex).toBe(feedB.candidateIndex)

    feedA.items.forEach((item, i) => {
      if (i === position) {
        expect(item.kind).toBe('candidate')
        expect(feedB.items[i].kind).toBe('candidate')
        expect(item.candidateId).not.toBe(feedB.items[i].candidateId)
        expect(item.title).not.toBe(feedB.items[i].title)
      } else {
        expect(item).toEqual(feedB.items[i])
      }
    })
  })

  it('A/B 未显式给 position 时同样对齐(由 seed 推导)', () => {
    const project = makeProject()
    const options = { platform: 'youtube' as const, mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: false }
    const seed = 'ab-derive-seed'
    const feedA = generateFeed({ project, options, candidate: project.candidates[0], seed })
    const feedB = generateFeed({ project, options, candidate: project.candidates[1], seed })
    expect(feedA.candidateIndex).toBe(feedB.candidateIndex)
  })

  it('randomizeMetadata 开启时, A/B 的干扰项元数据仍保持一致', () => {
    const project = makeProject()
    const options = { platform: 'youtube' as const, mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: true }
    const seed = 'ab-jitter-seed'
    const feedA = generateFeed({ project, options, candidate: project.candidates[0], seed, position: 2 })
    const feedB = generateFeed({ project, options, candidate: project.candidates[1], seed, position: 2 })
    feedA.items.forEach((item, i) => {
      if (i === 2) return
      expect(item.views).toBe(feedB.items[i].views)
      expect(item.publishedHoursAgo).toBe(feedB.items[i].publishedHoursAgo)
    })
  })
})

describe('feedGenerator — 空池与禁用', () => {
  it('禁用全部内置 mock 且无自定义时, Feed 只包含 Candidate', () => {
    const project = makeProject()
    project.disabledBuiltinMockIds = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16', 'm17', 'm18', 'm19', 'm20', 'm21', 'm22', 'm23', 'm24', 'm25', 'm26', 'm27', 'm28', 'm29', 'm30']
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 12, randomizeFeedOrder: true, randomizeMetadata: false },
      candidate: project.candidates[0],
      seed: 'empty-pool',
      position: 0,
    })
    expect(feed.items).toHaveLength(1)
    expect(feed.items[0].kind).toBe('candidate')
  })

  it('MockVideo 池不足 mockCount 时以重复项补齐且 id 唯一', () => {
    const project = makeProject()
    project.mockVideos = [
      { id: 'custom-1', title: '自定义干扰1', channel: '竞品A', views: 10000, durationSec: 300, publishedHoursAgo: 24, custom: true, enabled: true },
    ]
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 5, randomizeFeedOrder: false, randomizeMetadata: false },
      candidate: null,
      seed: 'small-pool',
      position: 0,
    })
    expect(feed.items).toHaveLength(5)
    const ids = new Set(feed.items.map((i) => i.id))
    expect(ids.size).toBe(5)
  })
})


describe('feedGenerator — 我的竞品库环境', () => {
  function withMockVideos(videos: MockVideo[]): Project {
    const project = makeProject()
    project.mockVideos = videos
    return project
  }

  const mv = (id: string, title: string, platform?: Platform, enabled = true): MockVideo => ({
    id,
    title,
    channel: '竞品频道',
    views: 50000,
    durationSec: 300,
    publishedHoursAgo: 48,
    platform,
    custom: true,
    enabled,
  })

  it('competitors 环境只使用启用且平台匹配的竞品视频', () => {
    const project = withMockVideos([
      mv('c1', '竞品-油管', 'youtube'),
      mv('c2', '竞品-B站', 'bilibili'),
      mv('c3', '竞品-通用'),
      mv('c4', '竞品-禁用', 'youtube', false),
    ])
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 3, randomizeFeedOrder: false, randomizeMetadata: false, category: 'competitors' },
      candidate: null,
      seed: 'comp-seed',
      position: 0,
    })
    const titles = feed.items.map((i) => i.title)
    expect(titles).toContain('竞品-油管')
    expect(titles).toContain('竞品-通用')
    expect(titles).not.toContain('竞品-B站')
    expect(titles).not.toContain('竞品-禁用')
    // 内置干扰库不应出现
    expect(titles).not.toContain('我在全是岩浆的世界生存了100天')
  })

  it('竞品库数量不足 mockCount 时重复补齐且 id 唯一', () => {
    const project = withMockVideos([mv('c1', '竞品一'), mv('c2', '竞品二')])
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 5, randomizeFeedOrder: false, randomizeMetadata: false, category: 'competitors' },
      candidate: null,
      seed: 'small-comp',
      position: 0,
    })
    expect(feed.items).toHaveLength(5)
    expect(new Set(feed.items.map((i) => i.id)).size).toBe(5)
  })

  it('site 环境不使用竞品专属过滤, 内置库仍然可用', () => {
    const project = withMockVideos([mv('c1', '竞品-油管', 'youtube')])
    const feed = generateFeed({
      project,
      options: { platform: 'youtube', mockCount: 6, randomizeFeedOrder: false, randomizeMetadata: false, category: 'site' },
      candidate: null,
      seed: 'site-seed',
      position: 0,
    })
    const titles = feed.items.map((i) => i.title)
    expect(titles).toContain('竞品-油管')
    expect(titles).toContain('【硬核】CPU到底是怎么造出来的?从沙子到芯片')
  })
})

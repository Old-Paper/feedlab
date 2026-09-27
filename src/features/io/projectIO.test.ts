// fake-indexeddb 必须最先加载, 使 Dexie 在 Node 测试环境可用
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildProjectExport, importProjectsFromFile, remapAssetRefs, validateProject } from './projectIO'
import { assetRepository, projectRepository } from '../../db/repositories/projectRepository'
import { db } from '../../db/database'
import type { Project } from '../../types'

function makeProject(): Project {
  const now = 1700000000000
  return {
    id: 'proj-original',
    name: '往返测试项目',
    createdAt: now,
    updatedAt: now + 1000,
    thumbnails: [
      {
        id: 'thumb-1',
        name: '封面1',
        assetId: 'asset-thumb-1',
        width: 1280,
        height: 720,
        createdAt: now,
        order: 0,
        crop: {
          'youtube-desktop': { zoom: 1.4, x: 0.5, y: -0.25 },
          'youtube-mobile': { zoom: 1.1, x: -0.3, y: 0.1 },
          'bilibili-desktop': { zoom: 1, x: 0, y: 0 },
          'bilibili-mobile': { zoom: 2, x: 0.9, y: 0.9 },
        },
      },
      {
        id: 'thumb-2',
        name: '封面2',
        assetId: 'asset-thumb-2',
        width: 1920,
        height: 1080,
        createdAt: now,
        order: 1,
        crop: {
          'youtube-desktop': { zoom: 1, x: 0, y: 0 },
          'youtube-mobile': { zoom: 1, x: 0, y: 0 },
          'bilibili-desktop': { zoom: 1, x: 0, y: 0 },
          'bilibili-mobile': { zoom: 1, x: 0, y: 0 },
        },
      },
    ],
    titles: [
      { id: 'title-1', text: '我在全是岩浆的世界生存了100天', order: 0, createdAt: now },
      { id: 'title-2', text: 'Minecraft但是整个世界都是岩浆', order: 1, createdAt: now },
      { id: 'title-3', text: '在岩浆海世界生存100天会发生什么?', order: 2, createdAt: now },
    ],
    candidates: [
      {
        id: 'cand-A',
        name: 'A方案',
        thumbnailId: 'thumb-1',
        titleId: 'title-1',
        enabled: true,
        createdAt: now,
        metadata: { views: 123456, durationSec: 345, publishedHoursAgo: 30, danmaku: 500 },
      },
      {
        id: 'cand-B',
        name: 'B方案',
        thumbnailId: 'thumb-2',
        titleId: 'title-2',
        enabled: false,
        createdAt: now,
        metadata: {},
      },
      {
        id: 'cand-C',
        name: 'C方案',
        thumbnailId: 'thumb-1',
        titleId: 'title-3',
        enabled: true,
        createdAt: now,
        metadata: { views: 42 },
      },
    ],
    channel: {
      name: '往返频道',
      avatarAssetId: 'asset-avatar',
      youtube: { channelName: 'RoundTrip YT', views: 555000, danmaku: 0, durationSec: 640, publishedHoursAgo: 33 },
      bilibili: { uploaderName: '往返UP', views: 444000, danmaku: 9900, durationSec: 520, publishedHoursAgo: 22 },
      metadataMode: 'random',
    },
    testSettings: {
      platform: 'bilibili',
      device: 'mobile',
      theme: 'dark',
      viewportPresetId: '390x844',
      viewportWidth: 390,
      viewportHeight: 844,
      mockCount: 20,
      randomizeFeedOrder: true,
      randomizeMetadata: false,
      positionMode: 'fixed',
      fixedPosition: 7,
      useFixedSeed: true,
      seed: 'roundtrip-seed',
      useRealPool: true,
      distractorCategory: 'minecraft',
      blindDuration: 10,
      rounds: 20,
      candidateScope: 'single',
      singleCandidateId: 'cand-A',
    },
    mockVideos: [
      {
        id: 'mock-1',
        title: '自定义竞品视频',
        channel: '竞品频道',
        views: 88000,
        danmaku: 1200,
        durationSec: 410,
        publishedHoursAgo: 15,
        thumbAssetId: 'asset-mock-thumb',
        custom: true,
        enabled: true,
      },
    ],
    disabledBuiltinMockIds: ['m01', 'm02'],
  }
}

function makeAsset(id: string, mime: string): { id: string; projectId: string; kind: 'thumbnail'; mime: string; name: string; width: number; height: number; size: number; createdAt: number; blob: Blob } {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, id.length]) // 伪 PNG 头 + 区分字节
  return {
    id,
    projectId: 'proj-original',
    kind: 'thumbnail',
    mime,
    name: `${id}.png`,
    width: 1280,
    height: 720,
    size: bytes.length,
    createdAt: 0,
    blob: new Blob([bytes], { type: mime }),
  }
}

async function seedDatabase(): Promise<void> {
  const project = makeProject()
  await projectRepository.put(project)
  await assetRepository.put(makeAsset('asset-thumb-1', 'image/png'))
  await assetRepository.put(makeAsset('asset-thumb-2', 'image/png'))
  await assetRepository.put(makeAsset('asset-avatar', 'image/jpeg'))
  await assetRepository.put(makeAsset('asset-mock-thumb', 'image/webp'))
}

describe('projectIO — Export → Import round-trip', () => {
  beforeEach(async () => {
    await db.projects.clear()
    await db.assets.clear()
    await db.testSessions.clear()
    await seedDatabase()
  })

  it('导出 → 导入后: 标题/Candidate 数量一致, crop 一致, 平台配置一致, metadata 一致', async () => {
    const original = await projectRepository.get('proj-original')
    expect(original).toBeDefined()

    const exported = await buildProjectExport('proj-original')
    expect(exported.format).toBe('feedlab.project')
    expect(exported.assets).toHaveLength(4)

    // 模拟文件传输: 序列化 → 反序列化
    const serialized = JSON.parse(JSON.stringify(exported))
    const file = new File([JSON.stringify(serialized)], 'roundtrip.project.json', { type: 'application/json' })
    const summary = await importProjectsFromFile(file)
    expect(summary.names).toHaveLength(1)

    const all = await projectRepository.list()
    expect(all).toHaveLength(2) // 原项目 + 导入的新项目
    const imported = all.find((p) => p.id !== 'proj-original')
    expect(imported).toBeDefined()
    expect(imported!.id).not.toBe('proj-original')
    expect(imported!.name).toBe('往返测试项目')

    // 数量一致
    expect(imported!.thumbnails).toHaveLength(2)
    expect(imported!.titles).toHaveLength(3)
    expect(imported!.candidates).toHaveLength(3)
    expect(imported!.mockVideos).toHaveLength(1)

    // Crop 数据一致
    expect(imported!.thumbnails[0].crop).toEqual(original!.thumbnails[0].crop)
    expect(imported!.thumbnails[0].crop['youtube-desktop']).toEqual({ zoom: 1.4, x: 0.5, y: -0.25 })
    expect(imported!.thumbnails[1].crop).toEqual(original!.thumbnails[1].crop)

    // 平台配置一致
    expect(imported!.testSettings).toEqual(original!.testSettings)
    expect(imported!.testSettings.platform).toBe('bilibili')
    expect(imported!.testSettings.distractorCategory).toBe('minecraft')

    // metadata 一致
    expect(imported!.candidates[0].metadata).toEqual(original!.candidates[0].metadata)
    expect(imported!.candidates[2].metadata).toEqual({ views: 42 })
    expect(imported!.candidates[1].enabled).toBe(false)

    // 频道配置一致 (avatarAssetId 导入时必然重映射, 单独验证)
    expect(imported!.channel.name).toBe(original!.channel.name)
    expect(imported!.channel.youtube).toEqual(original!.channel.youtube)
    expect(imported!.channel.bilibili).toEqual(original!.channel.bilibili)
    expect(imported!.channel.metadataMode).toBe(original!.channel.metadataMode)
    expect(imported!.channel.avatarAssetId).not.toBe(original!.channel.avatarAssetId)
    expect(await db.assets.get(imported!.channel.avatarAssetId ?? '')).toBeDefined()

    // 图片资源被重映射且真实写入数据库
    expect(imported!.thumbnails[0].assetId).not.toBe('asset-thumb-1')
    const remappedAsset = await db.assets.get(imported!.thumbnails[0].assetId)
    expect(remappedAsset).toBeDefined()
    const remappedAvatar = await db.assets.get(imported!.channel.avatarAssetId ?? '')
    expect(remappedAvatar).toBeDefined()
    const remappedMock = await db.assets.get(imported!.mockVideos[0].thumbAssetId ?? '')
    expect(remappedMock).toBeDefined()

    // 原项目未被破坏
    const originalAfter = await projectRepository.get('proj-original')
    expect(originalAfter).toBeDefined()
    expect(originalAfter!.thumbnails[0].assetId).toBe('asset-thumb-1')
  }, 20000)
})

describe('validateProject', () => {
  it('残缺数据抛出可读错误', () => {
    expect(() => validateProject({ id: 'x' } as unknown as Project)).toThrow()
    expect(() =>
      validateProject({ thumbnails: 'not-array', titles: [], candidates: [], channel: {}, testSettings: {} } as unknown as Project),
    ).toThrow()
  })

  it('对 partial 数据填充防御性默认值', () => {
    const p = {
      id: 'x',
      name: 'n',
      createdAt: 0,
      updatedAt: 0,
      thumbnails: [],
      titles: [],
      candidates: [],
      channel: { name: 'c' },
      testSettings: {},
      mockVideos: [
        { id: 'm1', title: 't', channel: 'c', views: 1, durationSec: 1, publishedHoursAgo: 1, enabled: false },
        { id: 'm2', title: 't2', channel: 'c', views: 2, durationSec: 2, publishedHoursAgo: 2 },
      ],
    } as unknown as Project
    validateProject(p)
    expect(p.disabledBuiltinMockIds).toEqual([])
    expect(p.mockVideos[0].custom).toBe(true)
    expect(p.mockVideos[0].enabled).toBe(false) // 显式禁用被保留
    expect(p.mockVideos[1].custom).toBe(true)
    expect(p.mockVideos[1].enabled).toBe(true) // 缺省时默认启用
  })
})

describe('remapAssetRefs', () => {
  it('重映射缩略图 / 频道头像 / 干扰视频封面的 assetId', () => {
    const project = makeProject()
    const map = new Map([
      ['asset-thumb-1', 'new-1'],
      ['asset-thumb-2', 'new-2'],
      ['asset-avatar', 'new-3'],
      ['asset-mock-thumb', 'new-4'],
    ])
    remapAssetRefs(project, map)
    expect(project.thumbnails[0].assetId).toBe('new-1')
    expect(project.thumbnails[1].assetId).toBe('new-2')
    expect(project.channel.avatarAssetId).toBe('new-3')
    expect(project.mockVideos[0].thumbAssetId).toBe('new-4')
    // 非资源引用不受影响
    expect(project.candidates[0].thumbnailId).toBe('thumb-1')
    expect(project.titles[0].text).toBe('我在全是岩浆的世界生存了100天')
  })

  it('映射表中缺失的 id 保持原值', () => {
    const project = makeProject()
    remapAssetRefs(project, new Map([['asset-thumb-1', 'new-1']]))
    expect(project.thumbnails[0].assetId).toBe('new-1')
    expect(project.thumbnails[1].assetId).toBe('asset-thumb-2')
  })
})

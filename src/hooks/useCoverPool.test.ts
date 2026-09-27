import { describe, expect, it } from 'vitest'
import { poolToMockVideos, type PoolEntry } from './useCoverPool'

describe('poolToMockVideos', () => {
  it('保留抓取到的频道头像 URL，同时兼容无头像的旧池文件', () => {
    const withAvatar: PoolEntry = {
      id: 'video-1',
      title: '带头像的视频',
      channel: '真实频道',
      views: 100,
      durationSec: 60,
      publishedHoursAgo: 2,
      pic: 'https://example.com/cover.jpg',
      avatar: 'https://example.com/avatar.jpg',
    }
    const legacy: PoolEntry = {
      id: 'video-2',
      title: '旧数据',
      channel: '旧频道',
      views: 50,
      durationSec: 30,
      publishedHoursAgo: 4,
      pic: 'https://example.com/legacy-cover.jpg',
    }
    const file = {
      generatedAt: '2026-09-28T00:00:00.000Z',
      bilibili: { hot: [withAvatar, legacy], low: [] },
      youtube: { hot: [], low: [] },
    }

    const videos = poolToMockVideos('bilibili', file)
    expect(videos[0].avatarSrcUrl).toBe(withAvatar.avatar)
    expect(videos[1].avatarSrcUrl).toBeUndefined()
  })
})

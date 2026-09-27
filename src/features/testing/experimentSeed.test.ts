import { describe, expect, it } from 'vitest'
import { createExperimentRunSeed, createExperimentSnapshot, deriveEnvironmentSeed, deriveRoundSeed } from './experimentSeed'
import type { TestSettings } from '../../types'

function makeSettings(partial: Partial<TestSettings>): TestSettings {
  return {
    platform: 'youtube',
    device: 'desktop',
    theme: 'light',
    viewportPresetId: '1920x1080',
    viewportWidth: 1920,
    viewportHeight: 1080,
    mockCount: 12,
    randomizeFeedOrder: true,
    randomizeMetadata: true,
    positionMode: 'random',
    fixedPosition: 1,
    useFixedSeed: false,
    seed: 'base-seed',
    useRealPool: true,
    competitionEnvironment: 'minecraft',
    lockCompetitionEnvironment: true,
    blindDuration: 5,
    rounds: 10,
    candidateScope: 'all',
    singleCandidateId: null,
    ...partial,
  }
}

describe('createExperimentRunSeed', () => {
  it('useFixedSeed=true: runSeed 使用配置的 Seed, 完全可复现', () => {
    const a = createExperimentRunSeed(makeSettings({ useFixedSeed: true, seed: 'feedlab' }))
    const b = createExperimentRunSeed(makeSettings({ useFixedSeed: true, seed: 'feedlab' }))
    expect(a.runSeed).toBe('feedlab')
    expect(b.runSeed).toBe('feedlab')
  })

  it('useFixedSeed=false: 每次运行生成新的随机 runSeed', () => {
    const a = createExperimentRunSeed(makeSettings({ useFixedSeed: false }))
    const b = createExperimentRunSeed(makeSettings({ useFixedSeed: false }))
    expect(a.runSeed).not.toBe(b.runSeed)
    expect(a.runSeed.length).toBeGreaterThan(0)
  })

  it('lock=true: environmentSeed 由 runSeed 派生, 同一次运行内恒定', () => {
    const run = createExperimentRunSeed(makeSettings({ useFixedSeed: false, lockCompetitionEnvironment: true }))
    expect(run.environmentSeed).toBe(deriveEnvironmentSeed(run.runSeed))
    expect(run.environmentSeed).toContain('#environment')
  })

  it('lock=false: environmentSeed 为空, 每轮独立生成种子', () => {
    const run = createExperimentRunSeed(makeSettings({ lockCompetitionEnvironment: false }))
    expect(run.environmentSeed).toBeUndefined()
  })
})

describe('deriveRoundSeed / deriveEnvironmentSeed', () => {
  it('roundSeed 由 runSeed 与轮次派生且可复现', () => {
    expect(deriveRoundSeed('run-1', 1)).toBe('run-1#round-1')
    expect(deriveRoundSeed('run-1', 2)).toBe('run-1#round-2')
    expect(deriveRoundSeed('run-1', 1)).toBe(deriveRoundSeed('run-1', 1))
  })

  it('environmentSeed 格式固定', () => {
    expect(deriveEnvironmentSeed('run-1')).toBe('run-1#environment')
  })
})

describe('createExperimentSnapshot', () => {
  it('创建时复制当时配置的字段值', () => {
    const settings = makeSettings({
      useFixedSeed: true,
      seed: 'snap-seed',
      competitionEnvironment: 'minecraft',
      lockCompetitionEnvironment: true,
      mockCount: 20,
    })
    const run = createExperimentRunSeed(settings)
    const snapshot = createExperimentSnapshot(settings, run)
    expect(snapshot.competitionEnvironment).toBe('minecraft')
    expect(snapshot.lockCompetitionEnvironment).toBe(true)
    expect(snapshot.useFixedSeed).toBe(true)
    expect(snapshot.randomizeFeedOrder).toBe(true)
    expect(snapshot.randomizeMetadata).toBe(true)
    expect(snapshot.mockCount).toBe(20)
    expect(snapshot.useRealPool).toBe(true)
    expect(snapshot.baseSeed).toBe('snap-seed')
    expect(snapshot.runSeed).toBe(run.runSeed)
    expect(snapshot.environmentSeed).toBe(run.environmentSeed)
  })

  it('创建后修改 settings 对象, 快照保持创建时的值(不可变语义)', () => {
    // settings 的 mockCount 使用默认值 12
    const settings = makeSettings({ competitionEnvironment: 'minecraft' })
    const run = createExperimentRunSeed(settings)
    const snapshot = createExperimentSnapshot(settings, run)
    expect(snapshot.competitionEnvironment).toBe('minecraft')
    expect(snapshot.mockCount).toBe(12)

    // 模拟用户事后修改项目设置
    settings.competitionEnvironment = 'competitors'
    settings.mockCount = 99
    settings.lockCompetitionEnvironment = false
    // 快照仍保持创建时的值, 不随后续修改变化
    expect(snapshot.competitionEnvironment).toBe('minecraft')
    expect(snapshot.mockCount).toBe(12)
    expect(snapshot.lockCompetitionEnvironment).toBe(true)
  })
})

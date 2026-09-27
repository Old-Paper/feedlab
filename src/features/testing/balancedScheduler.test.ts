import { describe, expect, it } from 'vitest'
import { BalancedScheduler, buildRoundPlans } from './balancedScheduler'
import { RandomEngine } from './randomEngine'
import { deriveEnvironmentSeed, deriveRoundSeed } from './experimentSeed'
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
    useFixedSeed: true,
    seed: 'scheduler-test-seed',
    useRealPool: false,
    competitionEnvironment: 'site',
    lockCompetitionEnvironment: false,
    blindDuration: 5,
    rounds: 10,
    candidateScope: 'all',
    singleCandidateId: null,
    ...partial,
  }
}

function tally(values: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return map
}

describe('BalancedScheduler — candidate shuffled-bag', () => {
  it('3 个 Candidate 跑 30 轮, 每个曝光次数差 <= 1', () => {
    const rng = new RandomEngine('bag-candidates')
    const scheduler = new BalancedScheduler(['A', 'B', 'C'], 13, rng, { positionMode: 'random', fixedPosition: 1 })
    const draws: string[] = []
    for (let i = 0; i < 30; i++) draws.push(scheduler.next().candidateId as string)
    const counts = tally(draws)
    const values = [...counts.values()]
    expect(counts.size).toBe(3)
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })
})

describe('BalancedScheduler — position shuffled-bag', () => {
  it('13 个槽位大量轮次后, 各位置曝光次数差 <= 1', () => {
    const rng = new RandomEngine('bag-positions')
    const scheduler = new BalancedScheduler(['only-candidate'], 13, rng, { positionMode: 'random', fixedPosition: 1 })
    const draws: string[] = []
    for (let i = 0; i < 13 * 4; i++) draws.push(String(scheduler.next().position))
    const counts = tally(draws)
    expect(counts.size).toBe(13)
    const values = [...counts.values()]
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })
})

describe('BalancedScheduler — fixed position', () => {
  it('positionMode=fixed 时所有轮次位置恒定', () => {
    const rng = new RandomEngine('fixed-pos')
    const scheduler = new BalancedScheduler(['A', 'B'], 13, rng, { positionMode: 'fixed', fixedPosition: 5 })
    for (let i = 0; i < 20; i++) {
      expect(scheduler.next().position).toBe(4) // 0-based
    }
  })

  it('fixedPosition 超出槽位范围时被钳制到最后一位', () => {
    const rng = new RandomEngine('fixed-clamp')
    const scheduler = new BalancedScheduler(['A'], 6, rng, { positionMode: 'fixed', fixedPosition: 99 })
    expect(scheduler.next().position).toBe(5)
  })
})

describe('BalancedScheduler — 袋边界防连续重复', () => {
  it('Candidate 数 > 1 时, 整个序列不存在同一 Candidate 连续出现', () => {
    const rng = new RandomEngine('no-consecutive')
    const scheduler = new BalancedScheduler(['A', 'B', 'C', 'D'], 13, rng, { positionMode: 'random', fixedPosition: 1 })
    const draws: string[] = []
    for (let i = 0; i < 40; i++) draws.push(scheduler.next().candidateId as string)
    for (let i = 1; i < draws.length; i++) {
      expect(draws[i]).not.toBe(draws[i - 1])
    }
  })
})

describe('buildRoundPlans — 可复现性', () => {
  it('完全相同的 seed / Candidate IDs / slot count / settings 产生完全相同的 RoundPlan', () => {
    const cfg = {
      settings: makeSettings({ seed: 'repro-seed', useFixedSeed: true }),
      platform: 'youtube' as const,
      enabledCandidateIds: ['c1', 'c2', 'c3'],
      mockCount: 12,
      rounds: 10,
    }
    const plansA = buildRoundPlans(cfg)
    const plansB = buildRoundPlans(cfg)
    expect(plansA).toEqual(plansB)
    expect(plansA).toHaveLength(10)
  })

  it('不同 seed 产生不同的轮次计划', () => {
    const base = {
      platform: 'youtube' as const,
      enabledCandidateIds: ['c1', 'c2', 'c3'],
      mockCount: 12,
      rounds: 10,
    }
    const a = buildRoundPlans({ ...base, settings: makeSettings({ seed: 'seed-one', useFixedSeed: true }) })
    const b = buildRoundPlans({ ...base, settings: makeSettings({ seed: 'seed-two', useFixedSeed: true }) })
    expect(a).not.toEqual(b)
  })

  it('candidateScope=single 时只出现指定的 Candidate', () => {
    const plans = buildRoundPlans({
      settings: makeSettings({ seed: 'single-scope', candidateScope: 'single', singleCandidateId: 'c2' }),
      platform: 'youtube',
      enabledCandidateIds: ['c1', 'c2', 'c3'],
      mockCount: 12,
      rounds: 9,
    })
    for (const plan of plans) expect(plan.candidateId).toBe('c2')
  })
})


describe('buildRoundPlans — 锁定竞争环境', () => {
  const base = {
    platform: 'youtube' as const,
    enabledCandidateIds: ['c1', 'c2', 'c3'],
    mockCount: 12,
    rounds: 9,
  }

  function tally(values: string[]): Map<string, number> {
    const map = new Map<string, number>()
    for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
    return map
  }

  it('锁定后所有轮次使用同一环境种子 (无论是否固定 Seed)', () => {
    for (const useFixedSeed of [true, false]) {
      const plans = buildRoundPlans({
        ...base,
        settings: makeSettings({ seed: 'lock-seed', lockCompetitionEnvironment: true, useFixedSeed }),
      })
      const seeds = new Set(plans.map((p) => p.seed))
      expect(seeds.size).toBe(1)
      expect(plans[0].seed).toContain('#environment')
    }
  })

  it('锁定后候选与位置仍按 Balanced Scheduler 均衡轮换', () => {
    const plans = buildRoundPlans({
      ...base,
      settings: makeSettings({ seed: 'lock-balance', lockCompetitionEnvironment: true }),
    })
    const candCounts = tally(plans.map((p) => p.candidateId as string))
    const candValues = [...candCounts.values()]
    expect(Math.max(...candValues) - Math.min(...candValues)).toBeLessThanOrEqual(1)

    const posCounts = tally(plans.map((p) => String(p.position)))
    const posValues = [...posCounts.values()]
    expect(Math.max(...posValues) - Math.min(...posValues)).toBeLessThanOrEqual(1)
  })

  it('未锁定且未固定 Seed 时, 各轮种子互不相同', () => {
    const plans = buildRoundPlans({
      ...base,
      settings: makeSettings({ seed: 'unlocked', lockCompetitionEnvironment: false, useFixedSeed: false }),
    })
    const seeds = new Set(plans.map((p) => p.seed))
    expect(seeds.size).toBe(9)
  })
})


describe('buildRoundPlans — Run-level Seed 语义', () => {
  const base = {
    platform: 'youtube' as const,
    enabledCandidateIds: ['c1', 'c2', 'c3'],
    mockCount: 12,
    rounds: 6,
  }

  it('useFixedSeed=true + lock=true: 重复创建两次, environmentSeed 与整个计划完全相同', () => {
    const cfg = { ...base, settings: makeSettings({ useFixedSeed: true, seed: 'fixed-seed', lockCompetitionEnvironment: true }) }
    const a = buildRoundPlans(cfg)
    const b = buildRoundPlans(cfg)
    expect(a).toEqual(b)
    expect(a[0].environmentSeed).toBe(deriveEnvironmentSeed('fixed-seed'))
  })

  it('useFixedSeed=false + lock=true: 同一次运行内所有轮次共享环境种子, 不同运行之间不同', () => {
    const cfg = { ...base, settings: makeSettings({ useFixedSeed: false, lockCompetitionEnvironment: true }) }
    const runA = buildRoundPlans(cfg)
    const runB = buildRoundPlans(cfg)
    // Run 内一致
    expect(new Set(runA.map((p) => p.seed)).size).toBe(1)
    expect(new Set(runB.map((p) => p.seed)).size).toBe(1)
    // Run 之间不同
    expect(runA[0].environmentSeed).not.toBe(runB[0].environmentSeed)
  })

  it('显式传入相同 runSeed 时计划可复现; 不同 runSeed 时环境种子不同', () => {
    const cfg = (runSeed: string) => ({
      ...base,
      settings: makeSettings({ useFixedSeed: false, lockCompetitionEnvironment: true }),
      runSeed,
    })
    const a1 = buildRoundPlans(cfg('run-A'))
    const a2 = buildRoundPlans(cfg('run-A'))
    const b = buildRoundPlans(cfg('run-B'))
    expect(a1).toEqual(a2)
    expect(a1[0].environmentSeed).toBe(deriveEnvironmentSeed('run-A'))
    expect(b[0].environmentSeed).toBe(deriveEnvironmentSeed('run-B'))
    expect(a1[0].environmentSeed).not.toBe(b[0].environmentSeed)
  })

  it('useFixedSeed=false + lock=false: 各轮种子互不相同(独立随机环境)', () => {
    const plans = buildRoundPlans({
      ...base,
      settings: makeSettings({ useFixedSeed: false, lockCompetitionEnvironment: false }),
    })
    expect(new Set(plans.map((p) => p.seed)).size).toBe(plans.length)
    expect(plans.every((p) => p.environmentSeed === undefined)).toBe(true)
  })

  it('useFixedSeed=true + lock=false: 整个实验仍可复现(轮种子由 runSeed 派生)', () => {
    const cfg = { ...base, settings: makeSettings({ useFixedSeed: true, seed: 'repro', lockCompetitionEnvironment: false }) }
    const a = buildRoundPlans(cfg)
    const b = buildRoundPlans(cfg)
    expect(a).toEqual(b)
    expect(a[0].seed).toBe(deriveRoundSeed('repro', 1))
    expect(a[5].seed).toBe(deriveRoundSeed('repro', 6))
  })
})

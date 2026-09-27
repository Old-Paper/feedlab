import { randomSeed } from './randomEngine'
import type { ExperimentSnapshot, TestSettings } from '../../types'

// ---------------------------------------------------------------------------
// Run-level Seed 语义
//
// runSeed           代表"一次完整的 Blind Test / Find Target 测试运行"。
//                   useFixedSeed=true  → 使用配置的 Seed, 整个实验可复现。
//                   useFixedSeed=false → 开始测试时随机生成, 换一次实验就换一次。
// schedulerSeed     由 runSeed 派生, 决定 Candidate 调度与位置轮换。
// environmentSeed   锁定竞争环境时由 runSeed 派生, 同一次运行内所有轮次共享
//                   同一批干扰视频; 未锁定时为空, 每轮独立生成种子。
//
// 锁定竞争环境 ≠ 永久固定竞争环境, 它只在"本次运行内部"锁定。
// ---------------------------------------------------------------------------

export interface ExperimentRunSeed {
  runSeed: string
  /** 锁定竞争环境时才有值; 未锁定时每轮独立生成种子 */
  environmentSeed: string | undefined
}

export interface RunSeedSettings {
  useFixedSeed: boolean
  seed: string
  lockCompetitionEnvironment: boolean
}

export function createExperimentRunSeed(settings: RunSeedSettings): ExperimentRunSeed {
  const runSeed = settings.useFixedSeed && settings.seed ? settings.seed : randomSeed()
  return {
    runSeed,
    environmentSeed:
      settings.lockCompetitionEnvironment === true ? deriveEnvironmentSeed(runSeed) : undefined,
  }
}

export function deriveEnvironmentSeed(runSeed: string): string {
  return `${runSeed}#environment`
}

export function deriveRoundSeed(runSeed: string, round: number): string {
  return `${runSeed}#round-${round}`
}

// ---------------------------------------------------------------------------
// 实验环境快照: TestSession 创建时写入, 之后不随 Project 设置变化。
// 只保存解释历史结果真正需要的配置, 不复制整个 Project。
// ---------------------------------------------------------------------------

export function createExperimentSnapshot(
  settings: TestSettings,
  run: ExperimentRunSeed,
): ExperimentSnapshot {
  return {
    competitionEnvironment: settings.competitionEnvironment,
    lockCompetitionEnvironment: settings.lockCompetitionEnvironment === true,
    useFixedSeed: settings.useFixedSeed === true,
    randomizeFeedOrder: settings.randomizeFeedOrder === true,
    randomizeMetadata: settings.randomizeMetadata === true,
    mockCount: settings.mockCount,
    useRealPool: settings.useRealPool === true,
    environmentSeed: run.environmentSeed,
    baseSeed: settings.seed,
    runSeed: run.runSeed,
  }
}

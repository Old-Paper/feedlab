import { RandomEngine, randomSeed } from './randomEngine'
import type { Platform, PositionMode, TestSettings } from '../../types'

/**
 * Balanced Test Scheduler.
 *
 * Instead of `random candidate each round` (which lets one candidate soak up
 * 8 of 10 rounds), it draws from shuffled "bags": each candidate (and each
 * feed slot, when positions are randomized) appears exactly once per bag
 * before any repeats. When a bag refills, a draw equal to the previous pick
 * is swapped to the front's neighbour, capping back-to-back repeats at 1.
 */
export class BalancedScheduler {
  private candidateBag: string[] = []
  private positionBag: number[] = []
  private lastCandidate: string | undefined
  private lastPosition: number | undefined

  constructor(
    private readonly candidateIds: string[],
    private readonly slotCount: number,
    private readonly rng: RandomEngine,
    private readonly options: {
      positionMode: PositionMode
      fixedPosition: number
    },
  ) {}

  private drawFromBag<T>(bag: T[], pool: readonly T[], last: T | undefined): T {
    if (bag.length === 0) {
      bag.push(...this.rng.shuffle(pool))
      if (bag.length > 1 && last !== undefined && bag[0] === last) {
        const tmp = bag[0]
        bag[0] = bag[1]
        bag[1] = tmp
      }
    }
    return bag.shift() as T
  }

  next(): { candidateId: string | null; position: number } {
    let candidateId: string | null = null
    if (this.candidateIds.length > 0) {
      candidateId = this.drawFromBag(this.candidateBag, this.candidateIds, this.lastCandidate)
      this.lastCandidate = candidateId
    }
    let position: number
    if (this.options.positionMode === 'fixed') {
      position = Math.min(Math.max(this.options.fixedPosition - 1, 0), Math.max(this.slotCount - 1, 0))
    } else {
      const slots = Array.from({ length: Math.max(this.slotCount, 1) }, (_, i) => i)
      position = this.drawFromBag(this.positionBag, slots, this.lastPosition)
      this.lastPosition = position
    }
    return { candidateId, position }
  }
}

export interface RoundPlan {
  round: number
  candidateId: string | null
  /** 0-based slot inside the feed. */
  position: number
  seed: string
}

export interface PlanConfig {
  settings: TestSettings
  platform: Platform
  enabledCandidateIds: string[]
  mockCount: number
  rounds: number
}

/**
 * Precomputes the full plan for a multi-round test so every round is stable
 * and reproducible: with a fixed base seed the whole sequence (candidate,
 * position, per-round feed seed) is deterministic.
 */
export function buildRoundPlans(cfg: PlanConfig): RoundPlan[] {
  const baseSeed = cfg.settings.seed || 'feedlab'
  const rng = new RandomEngine(`${baseSeed}#scheduler#${cfg.platform}`)
  const scopeSingle = cfg.settings.candidateScope === 'single' && cfg.settings.singleCandidateId
  const candidateIds =
    scopeSingle && cfg.settings.singleCandidateId ? [cfg.settings.singleCandidateId] : cfg.enabledCandidateIds
  const scheduler = new BalancedScheduler(candidateIds, cfg.mockCount + 1, rng, {
    positionMode: cfg.settings.positionMode,
    fixedPosition: cfg.settings.fixedPosition,
  })
  const plans: RoundPlan[] = []
  // 锁定竞争环境: 所有轮次共用同一环境种子 → 同一批干扰视频 + 相同顺序,
  // 候选与位置仍按 Balanced Scheduler 轮换, 保证不同方案面对同一组竞争视频。
  const lockEnvironment = cfg.settings.lockCompetitionEnvironment === true
  for (let i = 0; i < cfg.rounds; i++) {
    const draw = scheduler.next()
    plans.push({
      round: i + 1,
      candidateId: draw.candidateId,
      position: draw.position,
      seed: lockEnvironment
        ? `${baseSeed}#locked-env`
        : cfg.settings.useFixedSeed
          ? `${baseSeed}#round${i + 1}`
          : randomSeed(),
    })
  }
  return plans
}

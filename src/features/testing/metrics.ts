import type { CompetitionEnvironment, Device, Platform, TestMode, TestSession } from '../../types'
import { average, median } from '../../lib/format'

export interface SessionFilter {
  platform: Platform | 'all'
  device: Device | 'all'
  mode: TestMode | 'all'
}

export const NO_FILTER: SessionFilter = { platform: 'all', device: 'all', mode: 'all' }

export function applyFilter(sessions: TestSession[], filter: SessionFilter): TestSession[] {
  return sessions.filter(
    (s) =>
      (filter.platform === 'all' || s.platform === filter.platform) &&
      (filter.device === 'all' || s.device === filter.device) &&
      (filter.mode === 'all' || s.mode === filter.mode),
  )
}

export function envLabel(s: TestSession): string {
  const p = s.platform === 'youtube' ? 'YouTube' : 'Bilibili'
  const d = s.device === 'desktop' ? '桌面' : '手机'
  return `${p} ${d}`
}

// ---------------------------------------------------------------------------
// 指标按测试模式严格分开: 盲测的"反应时间"与找目标的"寻找用时"含义不同,
// 永远不混入同一个数字。
// ---------------------------------------------------------------------------

/**
 * Blind Test 指标 —— "第一眼选择率"指该方案在模拟曝光后被选为第一选择的比例,
 * 不代表 YouTube / Bilibili 后台的真实 CTR。
 */
export interface BlindTestMetric {
  candidateId: string
  /** 盲测有效轮数(即样本量 n) */
  impressions: number
  /** 被选为第一选择的次数 */
  firstChoices: number
  firstChoiceRate: number
  /** 第一选择命中的那些轮的反应时间 */
  averageReactionTime: number | null
  medianReactionTime: number | null
}

/**
 * Find Target 指标 —— 视觉显著性: 找到率与寻找用时(仅统计成功找到的轮次)。
 */
export interface FindTargetMetric {
  candidateId: string
  /** 找目标尝试轮数(即样本量 n) */
  impressions: number
  successfulFinds: number
  findRate: number
  averageFindTime: number | null
  medianFindTime: number | null
  /** 出现过错点的轮数 */
  wrongClickSessions: number
  wrongClickRate: number
  averageWrongClicks: number
}

function groupByCandidate(sessions: TestSession[]): Map<string, TestSession[]> {
  const groups = new Map<string, TestSession[]>()
  for (const s of sessions) {
    const list = groups.get(s.candidateId) ?? []
    list.push(s)
    groups.set(s.candidateId, list)
  }
  return groups
}

export function computeBlindMetrics(sessions: TestSession[]): BlindTestMetric[] {
  const rows: BlindTestMetric[] = []
  for (const [candidateId, all] of groupByCandidate(sessions)) {
    const blind = all.filter((s) => s.mode === 'blind')
    if (blind.length === 0) continue
    const firstChoices = blind.filter((s) => s.targetClicked)
    const reactions = firstChoices
      .map((s) => s.reactionTime)
      .filter((t): t is number => t != null)
    rows.push({
      candidateId,
      impressions: blind.length,
      firstChoices: firstChoices.length,
      firstChoiceRate: blind.length > 0 ? firstChoices.length / blind.length : 0,
      averageReactionTime: average(reactions),
      medianReactionTime: median(reactions),
    })
  }
  return rows.sort((a, b) => b.impressions - a.impressions)
}

export function computeFindMetrics(sessions: TestSession[]): FindTargetMetric[] {
  const rows: FindTargetMetric[] = []
  for (const [candidateId, all] of groupByCandidate(sessions)) {
    const find = all.filter((s) => s.mode === 'find')
    if (find.length === 0) continue
    const successful = find.filter((s) => s.targetClicked)
    const findTimes = successful
      .map((s) => s.reactionTime)
      .filter((t): t is number => t != null)
    const wrongTotal = find.reduce((acc, s) => acc + s.wrongClicks, 0)
    rows.push({
      candidateId,
      impressions: find.length,
      successfulFinds: successful.length,
      findRate: find.length > 0 ? successful.length / find.length : 0,
      averageFindTime: average(findTimes),
      medianFindTime: median(findTimes),
      wrongClickSessions: find.filter((s) => s.wrongClicks > 0).length,
      wrongClickRate: find.length > 0 ? find.filter((s) => s.wrongClicks > 0).length / find.length : 0,
      averageWrongClicks: find.length > 0 ? wrongTotal / find.length : 0,
    })
  }
  return rows.sort((a, b) => b.impressions - a.impressions)
}


// ---------------------------------------------------------------------------
// 实验环境快照汇总: 历史结果的环境信息来自 Session 自身快照,
// 绝不用当前 project.testSettings 冒充历史值。
// ---------------------------------------------------------------------------

export type HistoricalCompetitionEnvironment = CompetitionEnvironment | 'mixed' | 'unknown'

export interface ExperimentSummaryAggregate {
  competitionEnvironment: HistoricalCompetitionEnvironment
  lockCompetitionEnvironment: boolean | 'mixed' | 'unknown'
  useFixedSeed: boolean | 'mixed' | 'unknown'
  mockCount: number | 'mixed' | 'unknown'
  /** 有快照的记录数 */
  snapshotCount: number
  /** 无快照的旧记录数 */
  legacyCount: number
}

export function summarizeExperimentSnapshots(sessions: TestSession[]): ExperimentSummaryAggregate {
  const withSnapshot = sessions.filter((s) => s.experimentSnapshot)
  if (withSnapshot.length === 0) {
    // 旧记录: 无法可靠得知当时环境, 明确标记 unknown, 不用当前设置冒充
    return {
      competitionEnvironment: 'unknown',
      lockCompetitionEnvironment: 'unknown',
      useFixedSeed: 'unknown',
      mockCount: 'unknown',
      snapshotCount: 0,
      legacyCount: sessions.length,
    }
  }
  const uniq = <T,>(values: T[]): T[] => [...new Set(values)]
  const pick = <T,>(values: T[]): T | 'mixed' => (values.length === 1 ? values[0] : 'mixed')
  const envs = uniq(withSnapshot.map((s) => s.experimentSnapshot!.competitionEnvironment))
  const locks = uniq(withSnapshot.map((s) => s.experimentSnapshot!.lockCompetitionEnvironment))
  const fixed = uniq(withSnapshot.map((s) => s.experimentSnapshot!.useFixedSeed))
  const counts = uniq(withSnapshot.map((s) => s.experimentSnapshot!.mockCount))
  return {
    competitionEnvironment: pick(envs),
    lockCompetitionEnvironment: pick(locks),
    useFixedSeed: pick(fixed),
    mockCount: pick(counts),
    snapshotCount: withSnapshot.length,
    legacyCount: sessions.length - withSnapshot.length,
  }
}

export function formatEnvironmentDisplay(
  env: CompetitionEnvironment | 'mixed' | 'unknown',
  competitorCount: number,
  useRealPool?: boolean,
): string {
  if (env === 'mixed') return '混合（包含多个实验配置）'
  if (env === 'unknown') return '未保存（旧记录）'
  if (env === 'minecraft') return useRealPool ? 'Minecraft（真实池）' : 'Minecraft（内置库）'
  if (env === 'competitors') return `我的竞品库（${competitorCount} 条启用）`
  return useRealPool ? '全站（真实热门池）' : '全站（内置干扰库）'
}

export function formatLockDisplay(lock: boolean | 'mixed' | 'unknown'): string {
  if (lock === 'mixed') return '混合（不同批次配置不同）'
  if (lock === 'unknown') return '未记录（旧版本）'
  return lock ? '已锁定竞争池 —— 各方案面对同一组干扰视频' : '每轮随机抽取干扰视频'
}

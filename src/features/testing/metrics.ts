import type { Device, Platform, TestMode, TestSession } from '../../types'
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

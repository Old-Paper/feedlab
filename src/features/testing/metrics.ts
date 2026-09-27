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

export interface CandidateMetric {
  candidateId: string
  /** Sessions in the current filter. */
  impressions: number
  /** Blind test: candidate was the user's first choice. */
  targetClicks: number
  targetClickRate: number
  /** Blind: first-choice reaction times. Find: successful hunt durations. */
  avgReactionTime: number | null
  medianReactionTime: number | null
  /** Find target: hunts that ended on the correct video. */
  finds: number
  findRate: number
  /** Share of sessions with at least one wrong click (find mode). */
  wrongClickSessions: number
  wrongClickRate: number
  avgWrongClicks: number
}

export function envLabel(s: TestSession): string {
  const p = s.platform === 'youtube' ? 'YouTube' : 'Bilibili'
  const d = s.device === 'desktop' ? '桌面' : '手机'
  return `${p} ${d}`
}

export function computeCandidateMetrics(
  sessions: TestSession[],
  candidateName: (id: string) => string,
): Array<CandidateMetric & { name: string }> {
  const groups = new Map<string, TestSession[]>()
  for (const s of sessions) {
    const list = groups.get(s.candidateId) ?? []
    list.push(s)
    groups.set(s.candidateId, list)
  }

  const rows: Array<CandidateMetric & { name: string }> = []
  for (const [candidateId, list] of groups) {
    const reactions = list
      .filter((s) => (s.mode === 'blind' ? s.targetClicked && s.reactionTime != null : s.targetClicked && s.reactionTime != null))
      .map((s) => s.reactionTime as number)
    const findSessions = list.filter((s) => s.mode === 'find')
    const blindSessions = list.filter((s) => s.mode === 'blind')
    const targetClicks = blindSessions.filter((s) => s.targetClicked).length
    const finds = findSessions.filter((s) => s.targetClicked).length
    const wrongSessions = list.filter((s) => s.wrongClicks > 0).length
    const wrongTotal = list.reduce((acc, s) => acc + s.wrongClicks, 0)
    rows.push({
      candidateId,
      name: candidateName(candidateId),
      impressions: list.length,
      targetClicks,
      targetClickRate: blindSessions.length > 0 ? targetClicks / blindSessions.length : 0,
      avgReactionTime: average(reactions),
      medianReactionTime: median(reactions),
      finds,
      findRate: findSessions.length > 0 ? finds / findSessions.length : 0,
      wrongClickSessions: wrongSessions,
      wrongClickRate: list.length > 0 ? wrongSessions / list.length : 0,
      avgWrongClicks: list.length > 0 ? wrongTotal / list.length : 0,
    })
  }

  rows.sort((a, b) => b.impressions - a.impressions)
  return rows
}

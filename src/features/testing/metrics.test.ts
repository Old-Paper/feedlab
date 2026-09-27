import { describe, expect, it } from 'vitest'
import { applyFilter, computeBlindMetrics, computeFindMetrics, NO_FILTER } from './metrics'
import type { TestSession } from '../../types'

let seq = 0
function makeSession(partial: Partial<TestSession>): TestSession {
  seq += 1
  return {
    id: `s${seq}`,
    projectId: 'p1',
    startedAt: 0,
    finishedAt: 0,
    platform: 'youtube',
    device: 'desktop',
    viewport: { width: 1920, height: 1080 },
    mode: 'blind',
    candidateId: 'cand-A',
    thumbnailId: null,
    titleId: null,
    candidatePosition: 1,
    seed: 'seed',
    clickedVideoId: null,
    targetClicked: false,
    reactionTime: null,
    wrongClicks: 0,
    exposureDuration: 5,
    ...partial,
  }
}

describe('computeBlindMetrics', () => {
  it('空数据返回空数组, 不会产生 NaN', () => {
    expect(computeBlindMetrics([])).toEqual([])
  })

  it('impressions 只统计盲测轮数, 不混入找目标', () => {
    const sessions = [
      makeSession({ mode: 'blind', candidateId: 'X' }),
      makeSession({ mode: 'blind', candidateId: 'X' }),
      makeSession({ mode: 'find', candidateId: 'X' }),
    ]
    const rows = computeBlindMetrics(sessions)
    expect(rows).toHaveLength(1)
    expect(rows[0].impressions).toBe(2)
  })

  it('firstChoices 与 firstChoiceRate 正确', () => {
    const sessions = [
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 1000 }),
      makeSession({ candidateId: 'X', targetClicked: false }),
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 3000 }),
    ]
    const rows = computeBlindMetrics(sessions)
    expect(rows[0].firstChoices).toBe(2)
    expect(rows[0].firstChoiceRate).toBeCloseTo(2 / 3)
  })

  it('平均/中位反应时间只统计命中轮次 (奇数个样本)', () => {
    const sessions = [
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 3000 }),
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 1000 }),
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 2000 }),
      makeSession({ candidateId: 'X', targetClicked: false, reactionTime: 99999 }),
    ]
    const rows = computeBlindMetrics(sessions)
    expect(rows[0].averageReactionTime).toBe(2000)
    expect(rows[0].medianReactionTime).toBe(2000)
  })

  it('中位反应时间 (偶数个样本取中间均值)', () => {
    const sessions = [
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 1000 }),
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 2000 }),
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 3000 }),
      makeSession({ candidateId: 'X', targetClicked: true, reactionTime: 4000 }),
    ]
    const rows = computeBlindMetrics(sessions)
    expect(rows[0].medianReactionTime).toBe(2500)
    expect(rows[0].averageReactionTime).toBe(2500)
  })

  it('单条数据: 未命中时反应时间为 null 而非 NaN', () => {
    const rows = computeBlindMetrics([makeSession({ candidateId: 'X', targetClicked: false })])
    expect(rows[0].impressions).toBe(1)
    expect(rows[0].firstChoices).toBe(0)
    expect(rows[0].firstChoiceRate).toBe(0)
    expect(rows[0].averageReactionTime).toBeNull()
    expect(rows[0].medianReactionTime).toBeNull()
  })

  it('不同 Candidate 分别统计', () => {
    const sessions = [
      makeSession({ candidateId: 'A', targetClicked: true }),
      makeSession({ candidateId: 'B', targetClicked: false }),
      makeSession({ candidateId: 'B', targetClicked: true }),
    ]
    const rows = computeBlindMetrics(sessions)
    expect(rows).toHaveLength(2)
    const byId = new Map(rows.map((r) => [r.candidateId, r]))
    expect(byId.get('A')?.firstChoiceRate).toBe(1)
    expect(byId.get('B')?.firstChoiceRate).toBeCloseTo(0.5)
  })
})

describe('computeFindMetrics', () => {
  it('空数据返回空数组', () => {
    expect(computeFindMetrics([])).toEqual([])
  })

  it('findRate / 寻找用时 / 错点指标正确', () => {
    const sessions = [
      makeSession({ mode: 'find', candidateId: 'X', targetClicked: true, reactionTime: 10000, wrongClicks: 2 }),
      makeSession({ mode: 'find', candidateId: 'X', targetClicked: true, reactionTime: 20000, wrongClicks: 0 }),
      makeSession({ mode: 'find', candidateId: 'X', targetClicked: true, reactionTime: 30000, wrongClicks: 1 }),
      makeSession({ mode: 'find', candidateId: 'X', targetClicked: false, reactionTime: null, wrongClicks: 3 }),
    ]
    const rows = computeFindMetrics(sessions)
    expect(rows).toHaveLength(1)
    const m = rows[0]
    expect(m.impressions).toBe(4)
    expect(m.successfulFinds).toBe(3)
    expect(m.findRate).toBeCloseTo(3 / 4)
    expect(m.averageFindTime).toBe(20000) // 只统计成功的 3 轮
    expect(m.medianFindTime).toBe(20000)
    expect(m.wrongClickSessions).toBe(3) // 2,0,1,3 → 3 轮有错点
    expect(m.wrongClickRate).toBeCloseTo(3 / 4)
    expect(m.averageWrongClicks).toBeCloseTo(6 / 4)
  })

  it('单条成功数据: 平均 = 中位 = 该轮用时', () => {
    const rows = computeFindMetrics([
      makeSession({ mode: 'find', candidateId: 'X', targetClicked: true, reactionTime: 5250 }),
    ])
    expect(rows[0].impressions).toBe(1)
    expect(rows[0].successfulFinds).toBe(1)
    expect(rows[0].findRate).toBe(1)
    expect(rows[0].averageFindTime).toBe(5250)
    expect(rows[0].medianFindTime).toBe(5250)
    expect(rows[0].wrongClickRate).toBe(0)
    expect(rows[0].averageWrongClicks).toBe(0)
  })

  it('不混入盲测数据', () => {
    const rows = computeFindMetrics([
      makeSession({ mode: 'blind', candidateId: 'X' }),
      makeSession({ mode: 'blind', candidateId: 'X', targetClicked: true, reactionTime: 100 }),
    ])
    expect(rows).toEqual([])
  })
})

describe('applyFilter — 混合 platform/device/mode', () => {
  const sessions = [
    makeSession({ platform: 'youtube', device: 'desktop', mode: 'blind', candidateId: 'A' }),
    makeSession({ platform: 'youtube', device: 'mobile', mode: 'blind', candidateId: 'A' }),
    makeSession({ platform: 'bilibili', device: 'desktop', mode: 'blind', candidateId: 'B' }),
    makeSession({ platform: 'bilibili', device: 'mobile', mode: 'find', candidateId: 'B' }),
    makeSession({ platform: 'bilibili', device: 'mobile', mode: 'find', candidateId: 'C' }),
  ]

  it('NO_FILTER 返回全部', () => {
    expect(applyFilter(sessions, NO_FILTER)).toHaveLength(5)
  })

  it('按平台 + 设备 + 模式精确过滤', () => {
    const rows = applyFilter(sessions, { platform: 'bilibili', device: 'mobile', mode: 'find' })
    expect(rows).toHaveLength(2)
    expect(rows.every((s) => s.platform === 'bilibili' && s.device === 'mobile' && s.mode === 'find')).toBe(true)
  })

  it('只按平台过滤', () => {
    const rows = applyFilter(sessions, { platform: 'youtube', device: 'all', mode: 'all' })
    expect(rows).toHaveLength(2)
  })

  it('只按模式过滤', () => {
    const rows = applyFilter(sessions, { platform: 'all', device: 'all', mode: 'blind' })
    expect(rows).toHaveLength(3)
  })
})

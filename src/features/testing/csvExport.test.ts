import { describe, expect, it } from 'vitest'
import { sessionsToCsv } from './csvExport'
import type { TestSession } from '../../types'

function makeSession(partial: Partial<TestSession>): TestSession {
  return {
    id: 'session-1',
    projectId: 'p1',
    startedAt: 1700000000000,
    finishedAt: 1700000036000,
    platform: 'youtube',
    device: 'desktop',
    viewport: { width: 1920, height: 1080 },
    mode: 'blind',
    candidateId: 'cand-A',
    thumbnailId: null,
    titleId: null,
    candidatePosition: 4,
    seed: 'seed-abc',
    clickedVideoId: null,
    targetClicked: true,
    reactionTime: 1234,
    wrongClicks: 0,
    exposureDuration: 5,
    ...partial,
  }
}

describe('sessionsToCsv', () => {
  it('表头字段齐全且包含竞争环境列', () => {
    const csv = sessionsToCsv({ sessions: [], candidateName: () => 'x', competitionEnvironment: 'site' })
    const header = csv.replace(/^\uFEFF/, '').split('\r\n')[0]
    for (const col of ['sessionId', 'timestamp', 'candidateId', 'candidateName', 'platform', 'device', 'mode', 'position', 'targetClicked', 'reactionTime', 'wrongClicks', 'seed', 'competitionEnvironment']) {
      expect(header).toContain(col)
    }
  })

  it('每条 session 生成一行, 字段值正确', () => {
    const csv = sessionsToCsv({
      sessions: [makeSession({})],
      candidateName: () => 'A方案',
      competitionEnvironment: 'minecraft',
    })
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n')
    expect(lines).toHaveLength(2)
    const cells = lines[1].split(',')
    expect(cells[0]).toBe('session-1')
    expect(cells[1]).toBe(new Date(1700000036000).toISOString())
    expect(cells[3]).toBe('A方案')
    expect(cells[4]).toBe('youtube')
    expect(cells[6]).toBe('blind')
    expect(cells[7]).toBe('4')
    expect(cells[8]).toBe('true')
    expect(cells[9]).toBe('1234')
    expect(cells[11]).toBe('seed-abc')
    expect(cells[12]).toBe('minecraft')
  })

  it('候选名包含逗号/引号时正确转义', () => {
    const csv = sessionsToCsv({
      sessions: [makeSession({})],
      candidateName: () => '方案"A", 强化版',
      competitionEnvironment: 'site',
    })
    const dataLine = csv.replace(/^\uFEFF/, '').split('\r\n')[1]
    expect(dataLine).toContain('"方案""A"", 强化版"')
  })

  it('reactionTime 为 null 时导出空字段', () => {
    const csv = sessionsToCsv({
      sessions: [makeSession({ targetClicked: false, reactionTime: null })],
      candidateName: () => 'x',
      competitionEnvironment: 'competitors',
    })
    const cells = csv.split('\r\n')[1].split(',')
    expect(cells[9]).toBe('')
    expect(cells[8]).toBe('false')
  })

  it('空会话列表只有表头 + BOM', () => {
    const csv = sessionsToCsv({ sessions: [], candidateName: () => 'x', competitionEnvironment: 'site' })
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.replace(/^\uFEFF/, '').split('\r\n')).toHaveLength(1)
  })
})

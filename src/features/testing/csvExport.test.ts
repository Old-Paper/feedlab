import { describe, expect, it } from 'vitest'
import { sessionsToCsv } from './csvExport'
import type { ExperimentSnapshot, TestSession } from '../../types'

const snapshot: ExperimentSnapshot = {
  competitionEnvironment: 'minecraft',
  lockCompetitionEnvironment: true,
  useFixedSeed: true,
  randomizeFeedOrder: true,
  randomizeMetadata: false,
  mockCount: 12,
  useRealPool: true,
  environmentSeed: 'run-1#environment',
  baseSeed: 'run-1',
  runSeed: 'run-1',
}

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
  it('表头字段齐全且包含快照相关列', () => {
    const csv = sessionsToCsv({ sessions: [], candidateName: () => 'x' })
    const header = csv.replace(/^﻿/, '').split('\r\n')[0]
    for (const col of [
      'sessionId',
      'timestamp',
      'candidateId',
      'candidateName',
      'platform',
      'device',
      'mode',
      'position',
      'targetClicked',
      'reactionTime',
      'wrongClicks',
      'seed',
      'competitionEnvironment',
      'lockCompetitionEnvironment',
      'useFixedSeed',
      'environmentSeed',
    ]) {
      expect(header).toContain(col)
    }
  })

  it('每行读取该 Session 自身快照的实验环境', () => {
    const csv = sessionsToCsv({
      sessions: [makeSession({ experimentSnapshot: snapshot })],
      candidateName: () => 'A方案',
    })
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines).toHaveLength(2)
    const cells = lines[1].split(',')
    expect(cells[0]).toBe('session-1')
    expect(cells[3]).toBe('A方案')
    expect(cells[4]).toBe('youtube')
    expect(cells[6]).toBe('blind')
    expect(cells[7]).toBe('4')
    expect(cells[8]).toBe('true')
    expect(cells[9]).toBe('1234')
    expect(cells[11]).toBe('seed-abc')
    // 快照值, 而非当前项目设置
    expect(cells[12]).toBe('minecraft')
    expect(cells[13]).toBe('true')
    expect(cells[14]).toBe('true')
    expect(cells[15]).toBe('run-1#environment')
  })

  it('旧记录无快照时输出 unknown, 不使用当前项目设置补填', () => {
    const csv = sessionsToCsv({
      sessions: [makeSession({})],
      candidateName: () => 'A方案',
    })
    const cells = csv.replace(/^﻿/, '').split('\r\n')[1].split(',')
    expect(cells[12]).toBe('unknown')
    expect(cells[13]).toBe('unknown')
    expect(cells[14]).toBe('unknown')
    expect(cells[15]).toBe('')
  })

  it('多条记录各行读取各自快照', () => {
    const csv = sessionsToCsv({
      sessions: [
        makeSession({ id: 's1', experimentSnapshot: snapshot }),
        makeSession({ id: 's2' }),
        makeSession({ id: 's3', experimentSnapshot: { ...snapshot, competitionEnvironment: 'competitors', environmentSeed: undefined } }),
      ],
      candidateName: () => 'x',
    })
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines).toHaveLength(4)
    expect(lines[1].includes(',minecraft,')).toBe(true)
    expect(lines[2].includes(',unknown,')).toBe(true)
    expect(lines[3].includes(',competitors,')).toBe(true)
  })

  it('候选名包含逗号/引号时正确转义', () => {
    const csv = sessionsToCsv({
      sessions: [makeSession({})],
      candidateName: () => '方案"A", 强化版',
    })
    const dataLine = csv.replace(/^﻿/, '').split('\r\n')[1]
    expect(dataLine).toContain('"方案""A"", 强化版"')
  })

  it('reactionTime 为 null 时导出空字段', () => {
    const csv = sessionsToCsv({
      sessions: [makeSession({ targetClicked: false, reactionTime: null })],
      candidateName: () => 'x',
    })
    const cells = csv.split('\r\n')[1].split(',')
    expect(cells[9]).toBe('')
    expect(cells[8]).toBe('false')
  })

  it('空会话列表只有表头 + BOM', () => {
    const csv = sessionsToCsv({ sessions: [], candidateName: () => 'x' })
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1).split('\r\n')).toHaveLength(1)
  })
})

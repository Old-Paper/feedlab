import type { CompetitionEnvironment, TestSession } from '../../types'

// 实验数据 CSV 导出 —— 方便在 Excel / Python 中继续分析。
// 只导出结构化数据, 不包含任何图片二进制。

const HEADER = [
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
] as const

function escapeCsv(value: string | number | boolean | null | undefined): string {
  const s = value == null ? '' : String(value)
  // 包含逗号 / 引号 / 换行时用引号包裹, 引号翻倍
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function sessionsToCsv(input: {
  sessions: TestSession[]
  candidateName: (id: string) => string
  competitionEnvironment: CompetitionEnvironment
}): string {
  const lines: string[] = [HEADER.join(',')]
  for (const s of input.sessions) {
    const row = [
      s.id,
      new Date(s.finishedAt).toISOString(),
      s.candidateId,
      input.candidateName(s.candidateId),
      s.platform,
      s.device,
      s.mode,
      String(s.candidatePosition),
      s.targetClicked ? 'true' : 'false',
      s.reactionTime == null ? '' : String(s.reactionTime),
      String(s.wrongClicks),
      s.seed,
      input.competitionEnvironment,
    ]
    lines.push(row.map(escapeCsv).join(','))
  }
  // BOM: 让 Excel 正确识别 UTF-8 中文
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

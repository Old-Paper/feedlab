import { useMemo, useState } from 'react'
import { Grid3x3 } from 'lucide-react'
import type { TestSession } from '../types'

/**
 * 位置偏差分析（盲测）: 检查某个 Candidate 的成绩是否依赖特定位置
 * （例如第一屏左上角）。按 Candidate × Position 聚合曝光与第一眼选择。
 */
export function PositionBiasCard({
  sessions,
  candidateName,
}: {
  sessions: TestSession[]
  candidateName: (id: string) => string
}) {
  const blindSessions = useMemo(() => sessions.filter((s) => s.mode === 'blind'), [sessions])
  const candidateIds = useMemo(() => [...new Set(blindSessions.map((s) => s.candidateId))], [blindSessions])
  const [selected, setSelected] = useState<string | null>(null)
  const active = selected && candidateIds.includes(selected) ? selected : candidateIds[0] ?? null

  const rows = useMemo(() => {
    if (!active) return []
    const map = new Map<number, { position: number; impressions: number; firstChoices: number }>()
    for (const s of blindSessions) {
      if (s.candidateId !== active) continue
      const pos = s.candidatePosition
      const row = map.get(pos) ?? { position: pos, impressions: 0, firstChoices: 0 }
      row.impressions += 1
      if (s.targetClicked) row.firstChoices += 1
      map.set(pos, row)
    }
    return [...map.values()].sort((a, b) => a.position - b.position)
  }, [blindSessions, active])

  const maxPosition = rows.reduce((m, r) => Math.max(m, r.position), 0)
  const columns = Array.from({ length: Math.min(maxPosition, 24) }, (_, i) => i + 1)
  const byposition = new Map(rows.map((r) => [r.position, r]))
  const lowSample = rows.some((r) => r.impressions > 0 && r.impressions < 3)

  if (blindSessions.length === 0) {
    return (
      <Section title="位置偏差分析（盲测）">
        <div className="py-4 text-center text-xs text-zinc-600">当前筛选下没有盲测数据</div>
      </Section>
    )
  }

  return (
    <Section
      title="位置偏差分析（盲测）"
      hint="检查某个方案的成绩是否依赖特定位置（例如第一屏左上角）"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">查看方案</span>
        <select
          value={active ?? ''}
          onChange={(e) => setSelected(e.target.value)}
          className="h-8 max-w-64 rounded-md border border-[#2f323c] bg-[#171920] px-2 text-[13px] text-zinc-200 outline-none"
        >
          {candidateIds.map((id) => (
            <option key={id} value={id}>
              {candidateName(id)}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="py-4 text-center text-xs text-zinc-600">暂无位置数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-left text-[12px]">
            <thead>
              <tr className="text-zinc-500">
                <th className="pb-2 pr-3 font-medium">指标</th>
                {columns.map((p) => (
                  <th key={p} className="px-2 pb-2 text-center font-medium tabular-nums">
                    第 {p} 位
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr>
                <td className="py-1.5 pr-3 text-zinc-400">曝光次数</td>
                {columns.map((p) => {
                  const r = byposition.get(p)
                  return (
                    <td key={p} className={`px-2 py-1.5 text-center text-zinc-300 ${r && r.impressions < 3 ? 'opacity-50' : ''}`}>
                      {r?.impressions ?? 0}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-zinc-400">第一眼选择</td>
                {columns.map((p) => {
                  const r = byposition.get(p)
                  return (
                    <td key={p} className={`px-2 py-1.5 text-center text-zinc-300 ${r && r.impressions < 3 ? 'opacity-50' : ''}`}>
                      {r?.firstChoices ?? 0}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-zinc-400">第一眼选择率</td>
                {columns.map((p) => {
                  const r = byposition.get(p)
                  const rate = r && r.impressions > 0 ? r.firstChoices / r.impressions : null
                  return (
                    <td key={p} className="px-1 py-1.5 text-center">
                      {rate == null ? (
                        <span className="text-zinc-700">—</span>
                      ) : (
                        <span
                          className="inline-block min-w-[3.2rem] rounded px-1.5 py-1 text-zinc-100"
                          style={{ background: `rgba(99, 102, 241, ${(rate * 0.65).toFixed(2)})` }}
                        >
                          {Math.round(rate * 100)}%
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
          <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-500">
            {lowSample ? '部分位置样本过少（n<3），灰显数据仅供参考。' : '颜色越深代表该位置的第一眼选择率越高。'}
            位置本身不改变视频内容, 只影响注意力分布。
          </p>
        </div>
      )}
    </Section>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#23252e] bg-[#12141a]">
      <header className="flex items-center justify-between border-b border-[#23252e] px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-200">
            <Grid3x3 size={14} className="text-zinc-500" /> {title}
          </h3>
          {hint ? <span className="text-[11px] text-zinc-600">{hint}</span> : null}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

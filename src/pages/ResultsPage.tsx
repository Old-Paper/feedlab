import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Trash2 } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { sessionRepository } from '../db/repositories/sessionRepository'
import { applyFilter, computeCandidateMetrics, envLabel, NO_FILTER, type SessionFilter } from '../features/testing/metrics'
import { Button, Badge, ConfirmModal, EmptyState, Segmented, SectionCard, Checkbox } from '../components/ui'
import { formatDate, formatSeconds, truncate } from '../lib/format'
import type { Device, Platform, TestMode, TestSession } from '../types'

const ENV_OPTIONS: Array<{ value: SessionFilter['platform'] & ('all' | Platform); device: SessionFilter['device']; label: string }> = [
  { value: 'all', device: 'all', label: '全部环境' },
  { value: 'youtube', device: 'desktop', label: 'YT 桌面' },
  { value: 'youtube', device: 'mobile', label: 'YT 手机' },
  { value: 'bilibili', device: 'desktop', label: 'B站 桌面' },
  { value: 'bilibili', device: 'mobile', label: 'B站 手机' },
]

export function ResultsPage() {
  const project = useProjectStore((s) => s.project)!
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SessionFilter>(NO_FILTER)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [clearOpen, setClearOpen] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      setSessions(await sessionRepository.listByProject(project.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const candidateName = (id: string) => project.candidates.find((c) => c.id === id)?.name ?? '(已删除组合)'

  const filtered = useMemo(() => applyFilter(sessions, filter), [sessions, filter])
  const metrics = useMemo(() => computeCandidateMetrics(filtered, candidateName), [filtered, project.candidates])
  const blindRows = metrics.filter((m) => filtered.some((s) => s.candidateId === m.candidateId && s.mode === 'blind'))
  const findRows = metrics.filter((m) => filtered.some((s) => s.candidateId === m.candidateId && s.mode === 'find'))

  const envActive = (o: (typeof ENV_OPTIONS)[number]) => filter.platform === o.value && filter.device === o.device

  const compareRows = metrics.filter((m) => compareIds.has(m.candidateId))
  const maxCtr = Math.max(0.01, ...compareRows.map((r) => r.targetClickRate))

  const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`)
  const secs = (v: number | null) => (v == null ? '—' : formatSeconds(v))

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">加载测试记录…</div>
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
              <BarChart3 size={18} /> 测试结果
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">共 {sessions.length} 条记录 · 不同平台的指标必须分开看,不存在总评分</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<TestMode | 'all'>
              value={filter.mode}
              onChange={(v) => setFilter({ ...filter, mode: v })}
              options={[
                { value: 'all', label: '全部' },
                { value: 'blind', label: '盲测' },
                { value: 'find', label: '找目标' },
              ]}
            />
            <Segmented
              value={
                (ENV_OPTIONS.find((o) => envActive(o))?.value ?? 'all') +
                '-' +
                (ENV_OPTIONS.find((o) => envActive(o))?.device ?? 'all')
              }
              onChange={(v) => {
                const [p, d] = v.split('-') as [Platform | 'all', Device | 'all']
                setFilter({ ...filter, platform: p, device: d })
              }}
              options={ENV_OPTIONS.map((o) => ({ value: `${o.value}-${o.device}`, label: o.label }))}
            />
            <Button size="sm" variant="subtle" onClick={() => setClearOpen(true)}>
              <Trash2 size={13} /> 清空记录
            </Button>
          </div>
        </header>

        {sessions.length === 0 ? (
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="还没有测试数据"
            hint="去「盲测」或「找目标」页面完成至少一轮测试,这里会出现每个 Candidate 的表现指标。"
          />
        ) : (
          <div className="space-y-4">
            <SectionCard title={`盲测 · 第一选择表现(${blindRows.length} 个组合)`}>
              {blindRows.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-600">当前筛选下没有盲测数据</div>
              ) : (
                <MetricTable
                  head={['Candidate', '曝光', '首选次数', '首选率 CTR', '平均反应', '中位反应']}
                  rows={blindRows.map((m) => ({
                    id: m.candidateId,
                    name: m.name,
                    cells: [String(m.impressions), String(m.targetClicks), pct(m.targetClickRate), secs(m.avgReactionTime), secs(m.medianReactionTime)],
                  }))}
                />
              )}
            </SectionCard>

            <SectionCard title={`找目标 · 视觉显著性(${findRows.length} 个组合)`}>
              {findRows.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-600">当前筛选下没有找目标数据</div>
              ) : (
                <MetricTable
                  head={['Candidate', '尝试', '找到', '找到率', '平均用时', '错点率']}
                  rows={findRows.map((m) => ({
                    id: m.candidateId,
                    name: m.name,
                    cells: [String(m.impressions), String(m.finds), pct(m.findRate), secs(m.avgReactionTime), pct(m.wrongClickRate)],
                  }))}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Candidate 对比"
              hint="勾选 2 个以上进行横向比较"
              right={<Badge>{compareIds.size} 已选</Badge>}
            >
              {metrics.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-600">当前筛选下没有数据</div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {metrics.map((m) => (
                      <Checkbox
                        key={m.candidateId}
                        checked={compareIds.has(m.candidateId)}
                        onChange={(v) => {
                          const next = new Set(compareIds)
                          if (v) next.add(m.candidateId)
                          else next.delete(m.candidateId)
                          setCompareIds(next)
                        }}
                        label={truncate(m.name, 24)}
                      />
                    ))}
                  </div>
                  {compareRows.length >= 2 ? (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">首选率 CTR(盲测)</div>
                        <BarList
                          rows={compareRows.map((r) => ({ id: r.candidateId, name: r.name, value: r.targetClickRate, max: maxCtr, display: pct(r.targetClickRate) }))}
                          color="bg-indigo-500"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">找到率(找目标)</div>
                        <BarList
                          rows={compareRows.map((r) => ({ id: r.candidateId, name: r.name, value: r.findRate, max: Math.max(0.01, ...compareRows.map((x) => x.findRate)), display: pct(r.findRate) }))}
                          color="bg-emerald-500"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">平均反应 / 用时(越短越好)</div>
                        <BarList
                          rows={(() => {
                            const times = compareRows.map((r) => r.avgReactionTime ?? 0)
                            const max = Math.max(0.001, ...times)
                            return compareRows.map((r) => ({
                              id: r.candidateId,
                              name: r.name,
                              value: (r.avgReactionTime ?? 0) / max,
                              max: 1,
                              display: secs(r.avgReactionTime),
                            }))
                          })()}
                          color="bg-sky-500"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">错点率(找目标,越低越好)</div>
                        <BarList
                          rows={compareRows.map((r) => ({
                            id: r.candidateId,
                            name: r.name,
                            value: r.wrongClickRate,
                            max: Math.max(0.01, ...compareRows.map((x) => x.wrongClickRate)),
                            display: pct(r.wrongClickRate),
                          }))}
                          color="bg-rose-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-zinc-600">勾选至少 2 个组合后显示对比条形图</div>
                  )}
                </>
              )}
            </SectionCard>

            <SectionCard title={`最近记录(${Math.min(filtered.length, 40)} / ${filtered.length})`}>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">时间</th>
                      <th className="py-1.5 pr-3 font-medium">模式</th>
                      <th className="py-1.5 pr-3 font-medium">环境</th>
                      <th className="py-1.5 pr-3 font-medium">Candidate</th>
                      <th className="py-1.5 pr-3 font-medium">位置</th>
                      <th className="py-1.5 pr-3 font-medium">用时</th>
                      <th className="py-1.5 pr-3 font-medium">错点</th>
                      <th className="py-1.5 font-medium">结果</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    {filtered.slice(0, 40).map((s) => (
                      <tr key={s.id} className="border-t border-[#1c1e25]">
                        <td className="py-1.5 pr-3 tabular-nums text-zinc-500">{formatDate(s.finishedAt)}</td>
                        <td className="py-1.5 pr-3">{s.mode === 'blind' ? '盲测' : '找目标'}</td>
                        <td className="py-1.5 pr-3">{envLabel(s)}</td>
                        <td className="max-w-52 truncate py-1.5 pr-3">{candidateName(s.candidateId)}</td>
                        <td className="py-1.5 pr-3 tabular-nums">#{s.candidatePosition}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{s.reactionTime != null ? formatSeconds(s.reactionTime) : '—'}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{s.wrongClicks}</td>
                        <td className="py-1.5">
                          {s.targetClicked ? <Badge tone="success">命中</Badge> : <Badge>未点中</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      <ConfirmModal
        open={clearOpen}
        title="清空测试记录"
        message={`删除项目「${project.name}」的全部 ${sessions.length} 条测试记录?Candidate 与封面不受影响,但指标无法恢复。`}
        confirmText="清空"
        onConfirm={() => {
          void sessionRepository.deleteByProject(project.id).then(reload)
        }}
        onClose={() => setClearOpen(false)}
      />
    </div>
  )
}

function MetricTable({ head, rows }: { head: string[]; rows: Array<{ id: string; name: string; cells: string[] }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="text-xs text-zinc-500">
            {head.map((h, i) => (
              <th key={i} className="pb-2 pr-4 font-medium last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#1c1e25]">
              <td className="max-w-64 truncate py-2 pr-4 font-medium text-zinc-200">{r.name}</td>
              {r.cells.map((c, i) => (
                <td key={i} className="py-2 pr-4 tabular-nums text-zinc-300 last:pr-0">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BarList({ rows, color }: { rows: Array<{ id: string; name: string; value: number; max: number; display: string }>; color: string }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-xs text-zinc-300">{r.name}</span>
          <div className="h-4 min-w-0 flex-1 rounded-sm bg-[#1a1c23]">
            <div className={`h-full rounded-sm ${color}`} style={{ width: `${Math.max(2, (r.value / r.max) * 100)}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right text-xs tabular-nums text-zinc-400">{r.display}</span>
        </div>
      ))}
    </div>
  )
}

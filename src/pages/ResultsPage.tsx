import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Trash2 } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { sessionRepository } from '../db/repositories/sessionRepository'
import { applyFilter, computeBlindMetrics, computeFindMetrics, envLabel, NO_FILTER, type BlindTestMetric, type FindTargetMetric, type SessionFilter } from '../features/testing/metrics'
import { formatCI, formatPercent, intervalsOverlap, sampleSizeHint, wilsonInterval } from '../features/testing/statistics'
import { Button, Badge, ConfirmModal, EmptyState, Segmented, SectionCard, Checkbox } from '../components/ui'
import { ExperimentSummaryCompact } from '../components/ExperimentSummary'
import { formatEnvironmentDisplay, formatLockDisplay, summarizeExperimentSnapshots } from '../features/testing/metrics'
import { PositionBiasCard } from '../components/PositionBiasCard'
import { downloadCsv, sessionsToCsv } from '../features/testing/csvExport'
import { formatDate, formatSeconds, truncate } from '../lib/format'
import type { Device, Platform, TestMode, TestSession } from '../types'

const ENV_OPTIONS: Array<{ value: Platform | 'all'; device: Device | 'all'; label: string }> = [
  { value: 'all', device: 'all', label: '全部环境' },
  { value: 'youtube', device: 'desktop', label: 'YT 桌面' },
  { value: 'youtube', device: 'mobile', label: 'YT 手机' },
  { value: 'bilibili', device: 'desktop', label: 'B站 桌面' },
  { value: 'bilibili', device: 'mobile', label: 'B站 手机' },
]

/** 样本量 n 的温和提示(仅 UI 风险提示, 不构成统计学判定)。 */
function SampleHint({ n }: { n: number }) {
  const hint = sampleSizeHint(n)
  const tone =
    hint.tone === 'severe'
      ? 'text-amber-400'
      : hint.tone === 'low'
        ? 'text-amber-300/80'
        : 'text-emerald-400/80'
  return (
    <span className={`text-[11px] ${tone}`}>
      n={n}
      {n > 0 ? ` · ${hint.text}` : ' · 暂无数据'}
    </span>
  )
}

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
  // 历史环境信息来自每条 Session 自身的快照, 绝不读取当前 project.testSettings
  const experimentSummary = useMemo(() => summarizeExperimentSnapshots(filtered), [filtered])
  const competitorCount = project.mockVideos.filter((m) => m.enabled).length
  const distinctCandidates = useMemo(() => new Set(filtered.map((s) => s.candidateId)).size, [filtered])
  const platformText = useMemo(() => {
    const platforms = [...new Set(filtered.map((s) => s.platform))].map((p) => (p === 'youtube' ? 'YouTube' : 'Bilibili'))
    const devices = [...new Set(filtered.map((s) => s.device))].map((d) => (d === 'desktop' ? '桌面' : '手机'))
    return `${platforms.join('/') || '—'} · ${devices.join('/') || '—'}`
  }, [filtered])
  const blindMetrics = useMemo(() => computeBlindMetrics(filtered), [filtered])
  const findMetrics = useMemo(() => computeFindMetrics(filtered), [filtered])

  const envActive = (o: (typeof ENV_OPTIONS)[number]) => filter.platform === o.value && filter.device === o.device

  type CompareRow =
    | ({ kind: 'blind'; name: string } & BlindTestMetric)
    | ({ kind: 'find'; name: string } & FindTargetMetric)
  const compareRows = useMemo<CompareRow[]>(() => {
    const blindRows = blindMetrics
      .filter((m) => compareIds.has(m.candidateId))
      .map((m) => ({ ...m, name: candidateName(m.candidateId), kind: 'blind' as const }))
    const findRows = findMetrics
      .filter((m) => compareIds.has(m.candidateId))
      .map((m) => ({ ...m, name: candidateName(m.candidateId), kind: 'find' as const }))
    return [...blindRows, ...findRows]
  }, [blindMetrics, findMetrics, compareIds, candidateName])
  const maxFirstChoice = Math.max(0.01, ...compareRows.filter((r) => r.kind === 'blind').map((r) => r.firstChoiceRate))
  const maxFind = Math.max(0.01, ...compareRows.filter((r) => r.kind === 'find').map((r) => r.findRate))

  // 两个方案的第一眼选择率置信区间高度重叠时, 给出"证据不足"的温和提示
  const firstChoiceCompareNote = useMemo(() => {
    const blindRows = compareRows.filter((r): r is Extract<CompareRow, { kind: 'blind' }> => r.kind === 'blind' && r.impressions > 0)
    if (blindRows.length !== 2) return null
    const [a, b] = blindRows
    const ciA = wilsonInterval(a.firstChoices, a.impressions)
    const ciB = wilsonInterval(b.firstChoices, b.impressions)
    return intervalsOverlap(ciA, ciB)
      ? '目前两方案第一眼选择率的置信区间重叠，证据不足以认为存在稳定差异'
      : '当前观察值存在差异；样本量有限时仍可能出现波动，建议继续积累测试轮数'
  }, [compareRows])

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
            <p className="mt-0.5 text-xs text-zinc-500">
              模拟信息流实验结果, 用于比较不同包装方案的相对表现 · 共 {sessions.length} 条记录
            </p>
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
            <Button
              size="sm"
              variant="subtle"
              disabled={filtered.length === 0}
              onClick={() => {
                const csv = sessionsToCsv({
                  sessions: filtered,
                  candidateName,
                })
                downloadCsv(`feedlab-results-${new Date().toISOString().slice(0, 10)}.csv`, csv)
              }}
            >
              导出 CSV
            </Button>
            <Button size="sm" variant="subtle" onClick={() => setClearOpen(true)}>
              <Trash2 size={13} /> 清空记录
            </Button>
          </div>
        </header>

        {sessions.length === 0 ? (
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="还没有测试数据"
            hint="去「盲测」或「找目标」页面完成至少一轮测试，这里会出现每个 Candidate 的表现指标。"
          />
        ) : (
          <div className="space-y-4">
            <ExperimentSummaryCompact
              platformText={platformText}
              environmentLabel={formatEnvironmentDisplay(
                experimentSummary.competitionEnvironment,
                competitorCount,
              )}
              countText={`${distinctCandidates} 个方案 · ${filtered.length} 条记录`}
              lockText={formatLockDisplay(experimentSummary.lockCompetitionEnvironment)}
            />
            {experimentSummary.legacyCount > 0 ? (
              <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                {experimentSummary.snapshotCount > 0
                  ? `包含 ${experimentSummary.legacyCount} 条未保存实验环境的旧记录，其竞争环境显示为 unknown。`
                  : '这些记录创建于实验环境快照功能上线之前，未保存当时的竞争环境配置。'}
              </div>
            ) : null}

            <SectionCard
              title={`盲测 · 第一眼选择表现（${blindMetrics.length} 个组合）`}
              hint="第一眼选择率 = 盲测中被选为第一选择的比例，不代表平台后台真实 CTR"
            >
              {blindMetrics.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-600">当前筛选下没有盲测数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead>
                      <tr className="text-xs text-zinc-500">
                        <th className="pb-2 pr-4 font-medium">Candidate</th>
                        <th className="pb-2 pr-4 font-medium">第一眼选择</th>
                        <th className="pb-2 pr-4 font-medium">第一眼选择率</th>
                        <th className="pb-2 pr-4 font-medium">95% 置信区间</th>
                        <th className="pb-2 pr-4 font-medium">平均反应</th>
                        <th className="pb-2 pr-4 font-medium">中位反应</th>
                        <th className="pb-2 font-medium">样本量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blindMetrics.map((m) => {
                        const ci = wilsonInterval(m.firstChoices, m.impressions)
                        return (
                          <tr key={m.candidateId} className="border-t border-[#1c1e25] align-top">
                            <td className="max-w-64 truncate py-2.5 pr-4 font-medium text-zinc-200">{candidateName(m.candidateId)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-300">
                              {m.firstChoices} / {m.impressions}
                            </td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-100">{formatPercent(m.firstChoiceRate)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-400">{formatCI(ci)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-300">{secs(m.averageReactionTime)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-300">{secs(m.medianReactionTime)}</td>
                            <td className="py-2.5">
                              <SampleHint n={m.impressions} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                    第一眼选择率：Blind Test 中该方案被选为第一选择的比例，不代表 YouTube / Bilibili 后台真实 CTR。
                    置信区间越窄说明估计越稳定；样本量小时区间会明显变宽。
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard title={`找目标 · 视觉显著性（${findMetrics.length} 个组合）`} hint="寻找用时仅统计成功找到的轮次">
              {findMetrics.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-600">当前筛选下没有找目标数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-[13px]">
                    <thead>
                      <tr className="text-xs text-zinc-500">
                        <th className="pb-2 pr-4 font-medium">Candidate</th>
                        <th className="pb-2 pr-4 font-medium">成功找到</th>
                        <th className="pb-2 pr-4 font-medium">找到率</th>
                        <th className="pb-2 pr-4 font-medium">95% 置信区间</th>
                        <th className="pb-2 pr-4 font-medium">平均寻找用时</th>
                        <th className="pb-2 pr-4 font-medium">中位寻找用时</th>
                        <th className="pb-2 pr-4 font-medium">错点率</th>
                        <th className="pb-2 font-medium">样本量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findMetrics.map((m) => {
                        const ci = wilsonInterval(m.successfulFinds, m.impressions)
                        return (
                          <tr key={m.candidateId} className="border-t border-[#1c1e25] align-top">
                            <td className="max-w-64 truncate py-2.5 pr-4 font-medium text-zinc-200">{candidateName(m.candidateId)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-300">
                              {m.successfulFinds} / {m.impressions}
                            </td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-100">{formatPercent(m.findRate)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-400">{formatCI(ci)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-300">{secs(m.averageFindTime)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-300">{secs(m.medianFindTime)}</td>
                            <td className="py-2.5 pr-4 tabular-nums text-zinc-300">{pct(m.wrongClickRate)}</td>
                            <td className="py-2.5">
                              <SampleHint n={m.impressions} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                    找到率：找目标测试中成功点到该方案的比例；寻找用时只统计成功找到的轮次，与盲测反应时间是不同指标。
                  </p>
                </div>
              )}
            </SectionCard>

            <PositionBiasCard sessions={filtered} candidateName={candidateName} />

            <SectionCard
              title="Candidate 对比"
              hint="条形仅按当前观察值排序，不构成对「最佳封面」的判定"
              right={<Badge>{compareIds.size} 已选</Badge>}
            >
              {blindMetrics.length + findMetrics.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-600">当前筛选下没有数据</div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {[...blindMetrics, ...findMetrics]
                      .filter((m, i, arr) => arr.findIndex((x) => x.candidateId === m.candidateId) === i)
                      .map((m) => (
                        <Checkbox
                          key={m.candidateId}
                          checked={compareIds.has(m.candidateId)}
                          onChange={(v) => {
                            const next = new Set(compareIds)
                            if (v) next.add(m.candidateId)
                            else next.delete(m.candidateId)
                            setCompareIds(next)
                          }}
                          label={truncate(candidateName(m.candidateId), 24)}
                        />
                      ))}
                  </div>
                  {compareRows.length >= 2 ? (
                    <div className="space-y-4">
                      {firstChoiceCompareNote ? (
                        <div className="rounded-md border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200/90">
                          {firstChoiceCompareNote}
                        </div>
                      ) : null}
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">第一眼选择率（盲测，当前观察值）</div>
                        <BarList
                          rows={compareRows
                            .filter((r) => r.kind === 'blind')
                            .map((r) => {
                              const ci = wilsonInterval(r.firstChoices, r.impressions)
                              return {
                                id: r.candidateId,
                                name: r.name,
                                value: r.firstChoiceRate,
                                max: maxFirstChoice,
                                display: `${formatPercent(r.firstChoiceRate)}（CI ${formatCI(ci)}）`,
                              }
                            })}
                          color="bg-indigo-500"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">找到率（找目标，当前观察值）</div>
                        <BarList
                          rows={compareRows
                            .filter((r) => r.kind === 'find')
                            .map((r) => {
                              const ci = wilsonInterval(r.successfulFinds, r.impressions)
                              return {
                                id: r.candidateId,
                                name: r.name,
                                value: r.findRate,
                                max: maxFind,
                                display: `${formatPercent(r.findRate)}（CI ${formatCI(ci)}）`,
                              }
                            })}
                          color="bg-emerald-500"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">盲测平均反应（仅命中轮次）</div>
                        <BarList
                          rows={(() => {
                            const blindRows = compareRows.filter((r): r is Extract<CompareRow, { kind: 'blind' }> => r.kind === 'blind')
                            const withTime = blindRows.flatMap((r) => (r.averageReactionTime != null ? [r.averageReactionTime] : []))
                            const max = Math.max(0.001, ...withTime)
                            return blindRows.flatMap((r) =>
                              r.averageReactionTime == null
                                ? []
                                : [
                                    {
                                      id: r.candidateId,
                                      name: r.name,
                                      value: r.averageReactionTime / max,
                                      max: 1,
                                      display: formatSeconds(r.averageReactionTime),
                                    },
                                  ],
                            )
                          })()}
                          color="bg-sky-500"
                        />
                      </div>
                      <div>
                        <div className="mb-1.5 text-xs font-medium text-zinc-400">错点率（找目标，越低越好）</div>
                        <BarList
                          rows={compareRows
                            .filter((r) => r.kind === 'find')
                            .map((r) => ({
                              id: r.candidateId,
                              name: r.name,
                              value: r.wrongClickRate,
                              max: Math.max(0.01, ...compareRows.filter((x) => x.kind === 'find').map((x) => x.wrongClickRate)),
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
              <div className="max-h-80 overflow-auto">
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
        message={`删除项目「${project.name}」的全部 ${sessions.length} 条测试记录？Candidate 与封面不受影响，但指标无法恢复。`}
        confirmText="清空"
        onConfirm={() => {
          void sessionRepository.deleteByProject(project.id).then(reload)
        }}
        onClose={() => setClearOpen(false)}
      />
    </div>
  )
}

function BarList({ rows, color }: { rows: Array<{ id: string; name: string; value: number; max: number; display: string }>; color: string }) {
  if (rows.length === 0) {
    return <div className="py-2 text-center text-xs text-zinc-600">当前筛选下没有该指标的数据</div>
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-xs text-zinc-300">{r.name}</span>
          <div className="h-4 min-w-0 flex-1 rounded-sm bg-[#1a1c23]">
            <div className={`h-full rounded-sm ${color}`} style={{ width: `${Math.max(2, (r.value / r.max) * 100)}%` }} />
          </div>
          <span className="w-44 shrink-0 text-right text-xs tabular-nums text-zinc-400">{r.display}</span>
        </div>
      ))}
    </div>
  )
}

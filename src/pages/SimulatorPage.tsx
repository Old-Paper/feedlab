import { useMemo, useState } from 'react'
import { Eye, Info, X } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { useSimulationStore, resolvePreviewPosition } from '../stores/simulationStore'
import { candidateById, derivePosition, generateFeed } from '../features/testing/feedGenerator'
import { useCoverPool } from '../hooks/useCoverPool'
import { DeviceViewport } from '../components/DeviceViewport'
import { FeedRenderer } from '../platforms'
import { InspectProvider, type InspectInfo } from '../components/feed/primitives'
import { TestSetupBar } from '../components/TestSetupBar'
import { EmptyState } from '../components/ui'

function InspectPanel({ info, onClose }: { info: InspectInfo | null; onClose: () => void }) {
  if (!info) return null
  return (
    <div
      className="absolute right-5 top-5 z-30 w-64 animate-fade-in rounded-lg border border-sky-500/40 p-3 text-xs shadow-xl backdrop-blur"
      style={{ background: 'rgba(13, 17, 26, 0.95)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-sky-300">
          <Info size={13} /> 真实显示尺寸
        </div>
        <button className="text-zinc-500 hover:text-zinc-200" onClick={onClose} aria-label="关闭">
          <X size={14} />
        </button>
      </div>
      <dl className="space-y-1.5 text-zinc-300">
        <Row label="显示尺寸" value={`${info.displayedWidth} × ${info.displayedHeight} px`} />
        <Row
          label="原图尺寸"
          value={info.sourceWidth ? `${info.sourceWidth} × ${info.sourceHeight} px` : '未设置封面'}
        />
        <Row label="缩放比例" value={info.imageScalePct ? `${info.imageScalePct.toFixed(1)}%` : '—'} />
        <Row label="标题行数" value={`${info.titleLines} 行${info.titleClamped ? '(截断)' : ''}`} />
        <Row label="可见字符" value={`${info.visibleChars} / ${info.totalChars}`} />
        <Row label="标题字号" value={`${info.titleFontSize.toFixed(1)} px`} />
      </dl>
      <div className="mt-2 border-t border-[#23252e] pt-2 text-[11px] leading-relaxed text-zinc-500">
        缩放比例过小或可见字符过少,说明设计在真实信息流里可能难以辨认。
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

export function SimulatorPage() {
  const project = useProjectStore((s) => s.project)!
  const sim = useSimulationStore()
  const [inspectInfo, setInspectInfo] = useState<InspectInfo | null>(null)

  const candidate = candidateById(project, sim.candidateId)
  const totalSlots = sim.mockCount + (candidate ? 1 : 0)
  const position = resolvePreviewPosition(sim, totalSlots, sim.seed, derivePosition)
  const pool = useCoverPool(
        sim.platform,
        sim.useRealPool && sim.competitionEnvironment !== 'competitors',
        sim.competitionEnvironment === 'minecraft' ? 'minecraft' : 'site',
      )

  const feed = useMemo(
    () =>
      generateFeed({
        project,
        options: {
          platform: sim.platform,
          mockCount: sim.mockCount,
          randomizeFeedOrder: sim.randomizeFeedOrder,
          randomizeMetadata: sim.randomizeMetadata,
          category: sim.competitionEnvironment,
          poolVideos: pool ?? undefined,
        },
        candidate,
        seed: sim.seed,
        position,
      }),
    [project, sim.platform, sim.mockCount, sim.randomizeFeedOrder, sim.randomizeMetadata, sim.seed, candidate, position, pool],
  )

  return (
    <div className="flex h-full flex-col">
      <TestSetupBar project={project} sim={sim} patch={sim.patch} onShuffle={sim.shuffle} />
      <div className="relative flex min-h-0 flex-1 flex-col p-4">
        {candidate ? (
          <>
            <DeviceViewport width={sim.viewportWidth} height={sim.viewportHeight} mobile={sim.device === 'mobile'}>
              <InspectProvider enabled={sim.inspectEnabled} report={setInspectInfo}>
                <div className="h-full" key={feed.seed}>
                  <FeedRenderer
                    platform={sim.platform}
                    device={sim.device}
                    theme={sim.theme}
                    feed={feed.items}
                    candidateIndex={feed.candidateIndex}
                    frameWidth={sim.viewportWidth}
                    frameHeight={sim.viewportHeight}
                    ytMobileStyle={sim.ytMobileStyle}
                  />
                </div>
              </InspectProvider>
            </DeviceViewport>
            {sim.inspectEnabled ? <InspectPanel info={inspectInfo} onClose={() => setInspectInfo(null)} /> : null}
            <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] text-zinc-400">
              <Eye size={12} />
              {candidate.name} · 位于第 {position + 1} / {feed.items.length} 位
              {sim.randomizeMetadata ? '' : ' · 元数据固定'}
            </div>
          </>
        ) : (
          <EmptyState
            title="还没有可选的 Candidate"
            hint="先到「项目编辑器 → Candidate 组合」里至少启用一个组合,再回到这里预览它在真实信息流中的样子。"
          />
        )}
      </div>
    </div>
  )
}

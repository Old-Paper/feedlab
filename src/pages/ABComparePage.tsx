import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { useSimulationStore } from '../stores/simulationStore'
import { candidateById, derivePosition, generateFeed } from '../features/testing/feedGenerator'
import { DeviceViewport } from '../components/DeviceViewport'
import { FeedRenderer } from '../platforms'
import { TestSetupBar } from '../components/TestSetupBar'
import { Button, Segmented } from '../components/ui'
import type { ABLayout } from '../stores/simulationStore'
import { clsx } from 'clsx'

/**
 * A/B Compare: one seed drives both feeds, so mock videos, their order,
 * metadata jitter and the candidate slot are bit-identical between A and B —
 * the only variable is the candidate itself. Candidate metadata jitter is
 * disabled to keep even the candidate's own numbers equal.
 */
export function ABComparePage() {
  const project = useProjectStore((s) => s.project)!
  const sim = useSimulationStore()
  const [showA, setShowA] = useState(true)

  const candidateA = candidateById(project, sim.abCandidateA)
  const candidateB = candidateById(project, sim.abCandidateB)

  const options = useMemo(
    () => ({
      platform: sim.platform,
      mockCount: sim.mockCount,
      randomizeFeedOrder: sim.randomizeFeedOrder,
      randomizeMetadata: false, // A/B must differ only by cover+title
    }),
    [sim.platform, sim.mockCount, sim.randomizeFeedOrder],
  )

  const totalSlots = sim.mockCount + 1
  const position = derivePosition(sim.seed, totalSlots)

  const feedA = useMemo(
    () => generateFeed({ project, options, candidate: candidateA, seed: sim.seed, position }),
    [project, options, candidateA, sim.seed, position],
  )
  const feedB = useMemo(
    () => generateFeed({ project, options, candidate: candidateB, seed: sim.seed, position }),
    [project, options, candidateB, sim.seed, position],
  )

  const frame = (feed: typeof feedA, candidateName: string | null, side: 'A' | 'B') => (
    <div
      className={clsx(
        'relative flex min-h-0 min-w-0',
        sim.abLayout === 'horizontal' ? 'flex-1' : 'flex-1 flex-col',
      )}
    >
      <div
        className={clsx(
          'absolute z-20 rounded px-1.5 py-0.5 text-[11px] font-bold text-white shadow',
          side === 'A' ? 'bg-indigo-600' : 'bg-zinc-500',
          sim.abLayout === 'vertical' ? 'left-3 top-3' : 'left-3 top-3',
        )}
      >
        {side}
      </div>
      <DeviceViewport width={sim.viewportWidth} height={sim.viewportHeight} mobile={sim.device === 'mobile'}>
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
      </DeviceViewport>
      <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-zinc-300">
        {side} · {candidateName ?? '未选择'}
      </div>
    </div>
  )

  if (!candidateA || !candidateB) {
    return (
      <div className="flex h-full flex-col">
        <TestSetupBar project={project} sim={sim} patch={sim.patch} onShuffle={sim.shuffle} showCandidate={false} showInspect={false} />
        <div className="mx-auto w-full max-w-xl px-6 py-10">
          <div className="rounded-lg border border-[#23252e] bg-[#12141a] p-5">
            <h2 className="text-sm font-semibold text-zinc-100">选择要对比的两组 Candidate</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center rounded bg-indigo-600 px-1 text-xs font-bold text-white">A</span>
                <select
                  value={sim.abCandidateA ?? ''}
                  onChange={(e) => sim.patch({ abCandidateA: e.target.value || null })}
                  className="h-8 flex-1 rounded-md border border-[#2f323c] bg-[#171920] px-2 text-[13px] text-zinc-200 outline-none"
                >
                  <option value="">选择 Candidate A…</option>
                  {project.candidates.filter((c) => c.enabled).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 text-center rounded bg-zinc-500 px-1 text-xs font-bold text-white">B</span>
                <select
                  value={sim.abCandidateB ?? ''}
                  onChange={(e) => sim.patch({ abCandidateB: e.target.value || null })}
                  className="h-8 flex-1 rounded-md border border-[#2f323c] bg-[#171920] px-2 text-[13px] text-zinc-200 outline-none"
                >
                  <option value="">选择 Candidate B…</option>
                  {project.candidates.filter((c) => c.enabled).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {project.candidates.filter((c) => c.enabled).length < 2 ? (
              <p className="mt-3 text-xs text-amber-400">A/B 对比至少需要两个启用的 Candidate。</p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TestSetupBar project={project} sim={sim} patch={sim.patch} onShuffle={sim.shuffle} showCandidate={false} showInspect={false} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#1e2027] bg-[#0e1015] px-4 py-2">
        <Segmented<ABLayout>
          value={sim.abLayout}
          onChange={(v) => sim.patch({ abLayout: v })}
          options={[
            { value: 'horizontal', label: '左右对比' },
            { value: 'vertical', label: '上下对比' },
            { value: 'toggle', label: '快速切换' },
          ]}
        />
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">A</span>
          <span className="max-w-40 truncate text-zinc-300">{candidateA.name}</span>
          <span>vs</span>
          <span className="rounded bg-zinc-500 px-1.5 py-0.5 text-[10px] font-bold text-white">B</span>
          <span className="max-w-40 truncate text-zinc-300">{candidateB.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {sim.abLayout === 'toggle' ? (
            <Segmented<'a' | 'b'>
              value={showA ? 'a' : 'b'}
              onChange={(v) => setShowA(v === 'a')}
              options={[
                { value: 'a', label: '看 A' },
                { value: 'b', label: '看 B' },
              ]}
            />
          ) : null}
          <Button size="sm" onClick={sim.shuffle}>
            <Shuffle size={13} /> Shuffle(两图同步换环境)
          </Button>
        </div>
      </div>

      <div
        className={clsx(
          'min-h-0 flex-1 p-3',
          sim.abLayout === 'horizontal' && 'flex flex-row gap-3',
          sim.abLayout === 'vertical' && 'flex flex-col gap-3',
        )}
      >
        {sim.abLayout === 'toggle' ? (
          showA ? (
            frame(feedA, candidateA.name, 'A')
          ) : (
            frame(feedB, candidateB.name, 'B')
          )
        ) : (
          <>
            {frame(feedA, candidateA.name, 'A')}
            {frame(feedB, candidateB.name, 'B')}
          </>
        )}
      </div>
    </div>
  )
}

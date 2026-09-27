import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Play, Square, Timer } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { pickCandidatesForTest, useSimulationStore } from '../stores/simulationStore'
import { useTestStore } from '../stores/testStore'
import { buildRoundPlans } from '../features/testing/balancedScheduler'
import { candidateById, generateFeed, type FeedOptions } from '../features/testing/feedGenerator'
import { useCoverPool } from '../hooks/useCoverPool'
import { DeviceViewport } from '../components/DeviceViewport'
import { FeedRenderer } from '../platforms'
import { CountdownOverlay } from '../components/Countdown'
import { Button } from '../components/ui'
import { toast } from '../stores/toastStore'
import { formatSeconds } from '../lib/format'
import { uid } from '../lib/id'
import type { FeedVideo, TestSession, TestSettings } from '../types'

export function BlindTestPage() {
  const project = useProjectStore((s) => s.project)!
  const blindDuration = project.testSettings.blindDuration
  const rounds = project.testSettings.rounds
  const sim = useSimulationStore()
  const test = useTestStore()
  const [remaining, setRemaining] = useState(0)
  const questionStartRef = useRef(0)

  const enabledCount = project.candidates.filter((c) => c.enabled).length

  const pool = useCoverPool(sim.platform, sim.useRealPool, sim.distractorCategory)
  const options: FeedOptions = useMemo(
    () => ({
      platform: sim.platform,
      mockCount: sim.mockCount,
      randomizeFeedOrder: sim.randomizeFeedOrder,
      randomizeMetadata: sim.randomizeMetadata,
      category: sim.distractorCategory,
      poolVideos: pool ?? undefined,
    }),
    [sim.platform, sim.mockCount, sim.randomizeFeedOrder, sim.randomizeMetadata, pool],
  )

  const plan = test.plans[test.roundIndex]
  const candidate = candidateById(project, plan?.candidateId ?? null)
  const feed = useMemo(
    () =>
      plan
        ? generateFeed({ project, options, candidate, seed: plan.seed, position: plan.position })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan?.seed, plan?.position, plan?.candidateId, project, options],
  )

  const buildSession = (clickedVideoId: string, targetClicked: boolean, reactionTime: number, wrongClicks: number): TestSession | null => {
    if (!plan) return null
    return {
      id: uid(),
      projectId: project.id,
      startedAt: Date.now() - Math.max(1000, Math.round(reactionTime)),
      finishedAt: Date.now(),
      platform: sim.platform,
      device: sim.device,
      viewport: { width: sim.viewportWidth, height: sim.viewportHeight },
      mode: 'blind',
      candidateId: plan.candidateId ?? '',
      thumbnailId: candidate?.thumbnailId ?? null,
      titleId: candidate?.titleId ?? null,
      candidatePosition: plan.position + 1,
      seed: plan.seed,
      clickedVideoId,
      targetClicked,
      reactionTime: Math.round(reactionTime),
      wrongClicks,
      exposureDuration: project.testSettings.blindDuration,
    }
  }

  const start = () => {
    // 时长 / 轮数 / Candidate 范围始终来自项目测试设置(编辑器为唯一真源);
    // 环境参数(平台/设备/视口/干扰数/Seed)来自工具栏。
    const ts = project.testSettings
    const candidates = pickCandidatesForTest(project, {
      candidateScope: ts.candidateScope,
      singleCandidateId: ts.singleCandidateId,
    })
    if (candidates.length === 0) {
      toast.error('没有启用的 Candidate,先去编辑器生成组合')
      return
    }
    const settingsLike = {
      ...ts,
      platform: sim.platform,
      device: sim.device,
      theme: sim.theme,
      viewportPresetId: sim.viewportPresetId,
      viewportWidth: sim.viewportWidth,
      viewportHeight: sim.viewportHeight,
      mockCount: sim.mockCount,
      randomizeFeedOrder: sim.randomizeFeedOrder,
      randomizeMetadata: sim.randomizeMetadata,
      positionMode: sim.positionMode,
      fixedPosition: sim.fixedPosition,
      useFixedSeed: sim.useFixedSeed,
      seed: sim.seed,
    } satisfies TestSettings
    const plans = buildRoundPlans({
      settings: settingsLike,
      platform: sim.platform,
      enabledCandidateIds: candidates.map((c) => c.id),
      mockCount: sim.mockCount,
      rounds: ts.rounds,
    })
    test.startTest('blind', plans)
  }

  // Exposure timer -> question phase
  useEffect(() => {
    if (test.phase !== 'exposure') return
    const duration = project.testSettings.blindDuration
    if (duration === 0) return
    const startTs = performance.now()
    const iv = window.setInterval(() => {
      setRemaining(Math.max(0, duration - (performance.now() - startTs) / 1000))
    }, 100)
    const t = window.setTimeout(() => test.setPhase('question'), duration * 1000)
    return () => {
      window.clearInterval(iv)
      window.clearTimeout(t)
    }
  }, [test.phase, project.testSettings.blindDuration, test.setPhase])

  // Mark question start for reaction time
  useEffect(() => {
    if (test.phase === 'question') questionStartRef.current = performance.now()
  }, [test.phase])

  // Flash -> next round
  useEffect(() => {
    if (test.phase !== 'flash') return
    const t = window.setTimeout(() => test.advance(), 850)
    return () => window.clearTimeout(t)
  }, [test.phase, test.advance])

  const onAnswer = (v: FeedVideo) => {
    if (!plan || test.recording) return
    const targetClicked = v.kind === 'candidate'
    const reactionTime = performance.now() - questionStartRef.current
    const session = buildSession(v.id, targetClicked, reactionTime, 0)
    if (!session) return
    void test.submitRound(session, {
      round: plan.round,
      candidateId: plan.candidateId,
      targetClicked,
      reactionTime: session.reactionTime,
      wrongClicks: 0,
    })
  }

  // --- Idle: config + start ---
  if (test.mode !== 'blind' || test.phase === 'idle') {
    return (
      <div className="flex h-full flex-col">
        <TestHeader />
        <div className="mx-auto w-full max-w-2xl px-6 py-10">
          <div className="rounded-lg border border-[#23252e] bg-[#12141a] p-6">
            <h2 className="text-base font-semibold text-zinc-100">盲测(Blind Test)</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              信息流出现 {blindDuration === 0 ? '并保持显示' : `并停留 ${blindDuration} 秒`}后自动隐藏。
              然后你需要回答:<span className="text-zinc-200">「刚才第一眼最想点击哪个视频?」</span>
              目标视频不会以任何方式被标记,和干扰视频长得完全一样。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500 md:grid-cols-4">
              <Stat label="环境" value={`${sim.platform === 'youtube' ? 'YouTube' : 'Bilibili'} ${sim.device === 'desktop' ? '桌面' : '手机'}`} />
              <Stat label="Viewport" value={`${sim.viewportWidth}×${sim.viewportHeight}`} />
              <Stat label="展示时长" value={blindDuration === 0 ? '不限' : `${blindDuration}s`} />
              <Stat label="轮数" value={`${rounds} 轮`} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button variant="primary" onClick={start} disabled={enabledCount === 0}>
                <Play size={14} /> 开始盲测({rounds} 轮)
              </Button>
              {enabledCount === 0 ? <span className="text-xs text-amber-400">没有启用的 Candidate</span> : null}
              <Link to={`/project/${project.id}/editor`} className="text-xs text-indigo-400 hover:text-indigo-300">
                修改测试设置 →
              </Link>
            </div>
          </div>
          {test.results.length > 0 ? (
            <div className="mt-4 rounded-lg border border-[#23252e] bg-[#12141a] p-4 text-sm text-zinc-300">
              上一次盲测完成了 {test.results.length} 轮。
              <Link to={`/project/${project.id}/results`} className="ml-2 text-indigo-400 hover:text-indigo-300">
                查看结果 →
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // --- Running / finished ---
  const stage =
    feed && test.phase !== 'finished' ? (
      <div className="relative flex min-h-0 flex-1 flex-col p-4">
        <DeviceViewport width={sim.viewportWidth} height={sim.viewportHeight} mobile={sim.device === 'mobile'}>
          <div className="h-full" key={`${feed.seed}-${test.phase}`}>
            <FeedRenderer
              platform={sim.platform}
              device={sim.device}
              theme={sim.theme}
              feed={feed.items}
              candidateIndex={feed.candidateIndex}
              frameWidth={sim.viewportWidth}
              frameHeight={sim.viewportHeight}
              ytMobileStyle={sim.ytMobileStyle}
              onSelectVideo={test.phase === 'question' ? onAnswer : undefined}
            />
          </div>
        </DeviceViewport>

        {test.phase === 'countdown' ? <CountdownOverlay round={plan?.round ?? 1} total={test.plans.length} onDone={() => test.setPhase('exposure')} /> : null}

        {test.phase === 'exposure' ? (
          <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/70 px-4 py-1.5 text-xs text-zinc-300">
            <Timer size={13} />
            {blindDuration === 0 ? (
              <>
                观看信息流,看完后点击结束
                <Button size="sm" variant="primary" onClick={() => test.setPhase('question')}>
                  结束展示
                </Button>
              </>
            ) : (
              <>第 {plan?.round} / {test.plans.length} 轮 · 剩余 {remaining.toFixed(1)}s(记住你的第一选择)</>
            )}
          </div>
        ) : null}

        {test.phase === 'question' ? (
          <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-indigo-500/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg">
            <Eye size={13} /> 你刚才第一眼最想点击哪个视频?点击它
          </div>
        ) : null}

        {test.phase === 'flash' ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b0d11]/85">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`text-5xl ${test.lastResult?.targetClicked ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {test.lastResult?.targetClicked ? '✓' : '○'}
              </div>
              <div className="text-sm text-zinc-400">已记录 · 用时 {formatSeconds(test.lastResult?.reactionTime ?? 0)}</div>
            </div>
          </div>
        ) : null}
      </div>
    ) : null

  return (
    <div className="flex h-full flex-col">
      <TestHeader onStop />
      {stage}
      {test.phase === 'finished' ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-lg border border-[#23252e] bg-[#12141a] p-6 text-center">
            <h2 className="text-base font-semibold text-zinc-100">盲测完成</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-left text-xs">
              <Stat label="完成轮数" value={String(test.results.length)} />
              <Stat label="首选命中" value={`${test.results.filter((r) => r.targetClicked).length} 次`} />
              <Stat
                label="平均反应"
                value={(() => {
                  const rs = test.results.filter((r) => r.reactionTime != null).map((r) => r.reactionTime as number)
                  return rs.length ? formatSeconds(rs.reduce((a, b) => a + b, 0) / rs.length) : '—'
                })()}
              />
              <Stat label="覆盖 Candidate" value={String(new Set(test.results.map((r) => r.candidateId)).size)} />
            </div>
            <div className="mt-5 flex justify-center gap-2">
              <Link to={`/project/${project.id}/results`}>
                <Button variant="primary">查看完整结果</Button>
              </Link>
              <Button onClick={() => test.stopTest()}>返回</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TestHeader({ onStop }: { onStop?: boolean }) {
  const test = useTestStore()
  const running = test.mode === 'blind' && test.phase !== 'idle' && test.phase !== 'finished'
  return (
    <header className="flex items-center justify-between border-b border-[#1e2027] bg-[#101218] px-4 py-2.5">
      <h1 className="text-sm font-bold text-zinc-100">盲测 · Blind Test</h1>
      <div className="flex items-center gap-3">
        {running ? (
          <span className="text-xs text-zinc-500">
            第 {test.plans[test.roundIndex]?.round ?? '-'} / {test.plans.length} 轮
          </span>
        ) : null}
        {onStop && running ? (
          <Button size="sm" onClick={() => test.stopTest()}>
            <Square size={12} /> 结束测试
          </Button>
        ) : null}
      </div>
    </header>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#171920] px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium text-zinc-200">{value}</div>
    </div>
  )
}

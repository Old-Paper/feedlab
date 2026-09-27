import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, Play, Square } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { pickCandidatesForTest, useSimulationStore } from '../stores/simulationStore'
import { useTestStore } from '../stores/testStore'
import { buildRoundPlans } from '../features/testing/balancedScheduler'
import { candidateById, generateFeed, type FeedOptions } from '../features/testing/feedGenerator'
import { DeviceViewport } from '../components/DeviceViewport'
import { FeedRenderer } from '../platforms'
import { Button, EmptyState, Stat } from '../components/ui'
import { toast } from '../stores/toastStore'
import { formatSeconds } from '../lib/format'
import { uid } from '../lib/id'
import type { FeedVideo, TestSession, TestSettings } from '../types'

export function FindTargetPage() {
  const project = useProjectStore((s) => s.project)!
  const sim = useSimulationStore()
  const test = useTestStore()
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  const wrongRef = useRef(0)

  const enabledCount = project.candidates.filter((c) => c.enabled).length

  const targetChannel = useMemo(() => {
    const ch = project.channel
    return sim.platform === 'youtube' ? ch.youtube.channelName || ch.name : ch.bilibili.uploaderName || ch.name
  }, [project.channel, sim.platform])

  const options: FeedOptions = useMemo(
    () => ({
      platform: sim.platform,
      mockCount: sim.mockCount,
      randomizeFeedOrder: sim.randomizeFeedOrder,
      randomizeMetadata: sim.randomizeMetadata,
    }),
    [sim.platform, sim.mockCount, sim.randomizeFeedOrder, sim.randomizeMetadata],
  )

  const plan = test.plans[test.roundIndex]
  const candidate = candidateById(project, plan?.candidateId ?? null)
  const feed = useMemo(
    () => (plan ? generateFeed({ project, options, candidate, seed: plan.seed, position: plan.position }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan?.seed, plan?.position, plan?.candidateId, project, options],
  )

  // Live timer while hunting
  useEffect(() => {
    if (test.phase !== 'running') return
    const iv = window.setInterval(() => setElapsed(performance.now() - startRef.current), 80)
    return () => window.clearInterval(iv)
  }, [test.phase])

  const start = () => {
    // 时长 / 轮数 / Candidate 范围来自项目测试设置(编辑器为唯一真源)。
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
    wrongRef.current = 0
    test.startTest('find', plans)
  }

  const beginRound = () => {
    wrongRef.current = 0
    setElapsed(0)
    startRef.current = performance.now()
    test.setPhase('running')
  }

  const finishRound = (clickedVideoId: string, reactionTime: number) => {
    if (!plan) return
    const session: TestSession = {
      id: uid(),
      projectId: project.id,
      startedAt: Date.now() - Math.round(reactionTime),
      finishedAt: Date.now(),
      platform: sim.platform,
      device: sim.device,
      viewport: { width: sim.viewportWidth, height: sim.viewportHeight },
      mode: 'find',
      candidateId: plan.candidateId ?? '',
      thumbnailId: candidate?.thumbnailId ?? null,
      titleId: candidate?.titleId ?? null,
      candidatePosition: plan.position + 1,
      seed: plan.seed,
      clickedVideoId,
      targetClicked: true,
      reactionTime: Math.round(reactionTime),
      wrongClicks: wrongRef.current,
      exposureDuration: 0,
    }
    void test.submitRound(session, {
      round: plan.round,
      candidateId: plan.candidateId,
      targetClicked: true,
      reactionTime: session.reactionTime,
      wrongClicks: wrongRef.current,
    })
  }

  const onClickVideo = (v: FeedVideo) => {
    if (test.phase !== 'running' || test.recording) return
    if (v.kind === 'candidate') {
      finishRound(v.id, performance.now() - startRef.current)
    } else {
      wrongRef.current += 1
      toast.error('不是这个视频,继续找')
    }
  }

  if (test.mode !== 'find' || test.phase === 'idle') {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-[#1e2027] bg-[#101218] px-4 py-2.5">
          <h1 className="text-sm font-bold text-zinc-100">找目标 · Find Target</h1>
        </header>
        <div className="mx-auto w-full max-w-2xl px-6 py-10">
          <div className="rounded-lg border border-[#23252e] bg-[#12141a] p-6">
            <h2 className="text-base font-semibold text-zinc-100">视觉显著性测试</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
              信息流出现后立刻开始计时,你的任务是<span className="text-zinc-200">尽快找到并点击「{targetChannel}」的视频</span>。
              点错会计入错误次数,计时不会停止。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500 md:grid-cols-4">
              <Stat label="环境" value={`${sim.platform === 'youtube' ? 'YouTube' : 'Bilibili'} ${sim.device === 'desktop' ? '桌面' : '手机'}`} />
              <Stat label="Viewport" value={`${sim.viewportWidth}×${sim.viewportHeight}`} />
              <Stat label="目标频道" value={targetChannel} />
              <Stat label="轮数" value={`${project.testSettings.rounds} 轮`} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button variant="primary" onClick={start} disabled={enabledCount === 0}>
                <Play size={14} /> 开始测试({project.testSettings.rounds} 轮)
              </Button>
              {enabledCount === 0 ? <span className="text-xs text-amber-400">没有启用的 Candidate</span> : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (test.phase === 'finished') {
    const results = test.results
    const times = results.filter((r) => r.reactionTime != null).map((r) => r.reactionTime as number)
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-[#1e2027] bg-[#101218] px-4 py-2.5">
          <h1 className="text-sm font-bold text-zinc-100">找目标 · Find Target</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-lg border border-[#23252e] bg-[#12141a] p-6 text-center">
            <h2 className="text-base font-semibold text-zinc-100">测试完成</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-left text-xs">
              <Stat label="完成轮数" value={String(results.length)} />
              <Stat label="全部找到" value={`${results.filter((r) => r.targetClicked).length} 次`} />
              <Stat label="平均用时" value={avg != null ? formatSeconds(avg) : '—'} />
              <Stat label="累计错点" value={String(results.reduce((a, r) => a + r.wrongClicks, 0))} />
            </div>
            <div className="mt-5 flex justify-center gap-2">
              <Link to={`/project/${project.id}/results`}>
                <Button variant="primary">查看完整结果</Button>
              </Link>
              <Button onClick={() => test.stopTest()}>返回</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[#1e2027] bg-[#101218] px-4 py-2.5">
        <h1 className="text-sm font-bold text-zinc-100">找目标 · Find Target</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            第 {plan?.round ?? '-'} / {test.plans.length} 轮 · 错点 {wrongRef.current}
          </span>
          <Button size="sm" onClick={() => test.stopTest()}>
            <Square size={12} /> 结束测试
          </Button>
        </div>
      </header>

      {feed ? (
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
                onSelectVideo={test.phase === 'running' ? onClickVideo : undefined}
              />
            </div>
          </DeviceViewport>

          {test.phase === 'ready' ? (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#0b0d11]">
              <Crosshair size={36} className="text-indigo-400" />
              <div className="text-sm text-zinc-400">
                第 {plan?.round} / {test.plans.length} 轮 · 请尽快找到并点击
              </div>
              <div className="text-3xl font-bold text-zinc-100">「{targetChannel}」的视频</div>
              <Button variant="primary" onClick={beginRound}>
                <Play size={14} /> 开始(出现即计时)
              </Button>
            </div>
          ) : null}

          {test.phase === 'running' ? (
            <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-1.5 text-xs tabular-nums text-zinc-200">
              找到「{targetChannel}」 · <span className="font-semibold text-indigo-300">{formatSeconds(elapsed)}</span>
            </div>
          ) : null}

          {test.phase === 'flash' ? (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b0d11]/90">
              <div className="w-80 rounded-lg border border-[#23252e] bg-[#14161c] p-5 text-center">
                <div className="text-2xl font-bold text-emerald-400">{formatSeconds(test.lastResult?.reactionTime ?? 0)}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  找到目标 · 错点 {test.lastResult?.wrongClicks ?? 0} 次
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="primary" onClick={() => test.advance()}>
                    下一轮
                  </Button>
                  <Button onClick={() => test.stopTest()}>结束</Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState title="计划为空" />
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Pencil, Play, Timer } from 'lucide-react'
import { DeviceViewport } from '../components/DeviceViewport'
import { FeedRenderer } from '../platforms'
import { CountdownOverlay } from '../components/Countdown'
import { Button, Field, Modal, Segmented, Select, TextInput } from '../components/ui'
import { useCoverPool } from '../hooks/useCoverPool'
import { useAssetUrl } from '../hooks/useAssetUrl'
import { assetRepository } from '../db/repositories/projectRepository'
import { buildStoredAsset } from '../lib/image'
import { builtinMockThumb, BUILTIN_MOCK_VIDEOS } from '../mock/builtinMockVideos'
import { generateMockThumbDataUrl } from '../mock/generators'
import type { MockVideo } from '../types'
import { RandomEngine } from '../features/testing/randomEngine'
import { toast } from '../stores/toastStore'
import { errorMessage, formatSeconds } from '../lib/format'
import type { Device, FeedVideo, Platform, ThemeMode } from '../types'

// 简单模式: 打开即用。真实封面库信息流 + 左上角"你的视频"占位卡,
// 点击卡片设置封面/标题,右上角开始盲测(候选位置每轮随机)。

const LS_TITLE = 'quick.title'
const LS_CHANNEL = 'quick.channel'
const LS_ASSET = 'quick.assetId'
const QUICK_PROJECT = '__quick__'

function makeEmptyThumb(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
    `<rect width="640" height="360" fill="#26282e"/>` +
    `<rect x="14" y="14" width="612" height="332" rx="12" fill="none" stroke="#565a66" stroke-width="4" stroke-dasharray="14 10"/>` +
    `<g fill="#7a7e8a"><rect x="296" y="132" width="48" height="8" rx="3"/><rect x="296" y="150" width="48" height="8" rx="3"/><rect x="296" y="168" width="48" height="8" rx="3"/></g>` +
    `<text x="320" y="230" font-size="34" font-weight="600" fill="#9aa0ad" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif">点击设置封面</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

type Phase = 'edit' | 'countdown' | 'exposure' | 'question' | 'result'

function toFeedVideo(mv: MockVideo, key: string): FeedVideo {
  return {
    id: `mock:${key}:${mv.id}`,
    kind: 'mock',
    title: mv.title,
    channel: mv.channel,
    thumbAssetId: mv.thumbAssetId,
    thumbSrc: mv.thumbAssetId ? undefined : (mv.thumbSrcUrl ?? (mv.custom ? generateMockThumbDataUrl(`custom:${mv.id}`, mv.title) : builtinMockThumb(mv.id, mv.title))),
    avatarName: mv.channel,
    views: mv.views,
    danmaku: mv.danmaku,
    durationSec: mv.durationSec,
    publishedHoursAgo: mv.publishedHoursAgo,
  }
}

export function QuickModePage() {
  const [platform, setPlatform] = useState<Platform>('bilibili')
  const [device, setDevice] = useState<Device>('mobile')
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [duration, setDuration] = useState<number>(5)

  const [title, setTitle] = useState(() => localStorage.getItem(LS_TITLE) ?? '')
  const [channel, setChannel] = useState(() => localStorage.getItem(LS_CHANNEL) ?? '我的频道')
  const [assetId, setAssetId] = useState(() => localStorage.getItem(LS_ASSET))
  const [editorOpen, setEditorOpen] = useState(false)

  const [phase, setPhase] = useState<Phase>('edit')
  const [seed, setSeed] = useState('quick-init')
  const [positionMode, setPositionMode] = useState<'random' | 'fixed'>('random')
  const [manualPosition, setManualPosition] = useState<number | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; pointerId: number; active: boolean } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState({ rounds: 0, hits: 0 })
  const [lastResult, setLastResult] = useState<{ hit: boolean; reactionTime: number; position: number } | null>(null)
  const [remaining, setRemaining] = useState(0)
  const questionStartRef = useRef(0)
  const answeredRef = useRef(false)

  const pool = useCoverPool(platform, true)
  const assetUrl = useAssetUrl(assetId)

  const viewport = device === 'desktop' ? { w: 1600, h: 900 } : { w: 390, h: 844 }

  // 编辑阶段: 拖动决定位置(默认左上角第 1 格);测试阶段: 随机 或 拖定位置
  const position = useMemo(() => {
    if (phase === 'edit') return manualPosition ?? 0
    if (positionMode === 'fixed') return Math.min(manualPosition ?? 0, 12)
    return null
  }, [phase, manualPosition, positionMode])

  const feed = useMemo(() => {
    const rng = new RandomEngine(seed)
    const mocksSource = pool && pool.length >= 4 ? pool : BUILTIN_MOCK_VIDEOS
    const mocks = rng.shuffle(mocksSource).slice(0, 12)
    const candidate: FeedVideo = {
      id: 'candidate:quick',
      kind: 'candidate',
      candidateId: 'quick',
      title: title || '点击这里设置你的封面和标题',
      channel: channel || '我的频道',
      thumbAssetId: assetId ?? undefined,
      thumbSrc: assetId ? undefined : makeEmptyThumb(),
      avatarName: channel || '我的频道',
      views: 128000,
      danmaku: platform === 'bilibili' ? 2100 : undefined,
      durationSec: 615,
      publishedHoursAgo: 26,
    }
    const pos = position ?? rng.int(0, mocks.length)
    const items: FeedVideo[] = []
    let cursor = 0
    for (let i = 0; i < mocks.length + 1; i++) {
      if (i === pos) items.push(candidate)
      else items.push(toFeedVideo(mocks[cursor++], `${cursor}-${seed}`))
    }
    return { items, position: pos }
  }, [pool, seed, title, channel, assetId, platform, position])

  // 倒计时结束 → 展示计时
  useEffect(() => {
    if (phase !== 'exposure' || duration === 0) return
    const start = performance.now()
    const iv = window.setInterval(() => setRemaining(Math.max(0, duration - (performance.now() - start) / 1000)), 100)
    const t = window.setTimeout(() => setPhase('question'), duration * 1000)
    return () => {
      window.clearInterval(iv)
      window.clearTimeout(t)
    }
  }, [phase, duration])

  const startRound = () => {
    setScore((s) => s)
    answeredRef.current = false
    setSeed(`quick-${Date.now()}-${Math.floor(Math.random() * 1e9)}`)
    setRound((r) => r + 1)
    setPhase('countdown')
  }

  const answer = (v: FeedVideo) => {
    if (answeredRef.current) return
    answeredRef.current = true
    const hit = v.kind === 'candidate'
    const reactionTime = performance.now() - questionStartRef.current
    setScore((s) => ({ rounds: s.rounds + 1, hits: s.hits + (hit ? 1 : 0) }))
    setLastResult({ hit, reactionTime, position: feed.position + 1 })
    setPhase('result')
  }

  // —— 拖动候选卡(编辑阶段): pointer 事件自定义拖拽, 桌面鼠标与手机触摸通用 ——
  const onStagePointerDown = (e: React.PointerEvent) => {
    if (phase !== 'edit') return
    const target = (e.target as HTMLElement).closest('[data-inspect="thumb"]') as HTMLElement | null
    if (!target) return
    const thumbs = [...document.querySelectorAll('[data-inspect="thumb"]')]
    if (thumbs.indexOf(target) !== feed.position) return // 只能拖"你的视频"卡
    dragRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, active: false }
    try { stageRef.current?.setPointerCapture(e.pointerId) } catch { /* 合成事件可能无法捕获 */ }
  }
  const onStagePointerMove = (e: React.PointerEvent) => {
    const st = dragRef.current
    if (!st) return
    if (!st.active && Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 6) {
      st.active = true
      setDragActive(true)
    }
  }
  const onStagePointerUp = (e: React.PointerEvent) => {
    const st = dragRef.current
    if (!st) return
    dragRef.current = null
    try {
      stageRef.current?.releasePointerCapture?.(e.pointerId)
    } catch {
      // capture 未建立时忽略
    }
    setDragActive(false)
    if (!st.active) return
    const hitEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-inspect="thumb"]') as HTMLElement | null
    if (!hitEl) return
    const thumbs = [...document.querySelectorAll('[data-inspect="thumb"]')]
    const idx = thumbs.indexOf(hitEl)
    if (idx >= 0 && idx !== feed.position) {
      setManualPosition(idx)
      toast.info(`已移动到第 ${idx + 1} 位`)
    }
  }
  // 拖动中禁止触摸页面滚动, 避免手机上拖动与滚动打架
  useEffect(() => {
    if (!dragActive) return
    const block = (e: TouchEvent) => e.preventDefault()
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [dragActive])

  const questionBanner = phase === 'question' ? (
    <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-indigo-500/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg">
      你刚才第一眼最想点击哪个视频?点击它
    </div>
  ) : null

  const exposureBanner = phase === 'exposure' ? (
    <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/70 px-4 py-1.5 text-xs text-zinc-200">
      <Timer size={13} />
      {duration === 0 ? '看完后点击下方按钮' : `记住第一印象 · 剩余 ${remaining.toFixed(1)}s`}
    </div>
  ) : null

  return (
    <div className="flex h-full flex-col">
      {/* 简化工具条 */}
      <header className="flex flex-nowrap items-center gap-x-4 gap-y-2 overflow-x-auto border-b border-[#1e2027] bg-[#101218] px-4 py-2.5 md:flex-wrap [&>*]:shrink-0">
        <Segmented<Platform>
          value={platform}
          onChange={setPlatform}
          options={[
            { value: 'bilibili', label: 'B站' },
            { value: 'youtube', label: '油管' },
          ]}
        />
        <Segmented<Device>
          value={device}
          onChange={setDevice}
          options={[
            { value: 'mobile', label: '手机' },
            { value: 'desktop', label: '电脑' },
          ]}
        />
        <Segmented<ThemeMode>
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: '浅' },
            { value: 'dark', label: '深' },
          ]}
        />
        <Select value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))} title="展示时长">
          <option value="3">3秒</option>
          <option value="5">5秒</option>
          <option value="10">10秒</option>
          <option value="0">不限</option>
        </Select>
        <div className="flex items-center gap-1.5" title="固定 = 测试时使用你在预览里拖动的位置;随机 = 每轮随机出现">
          <Segmented<'random' | 'fixed'>
            value={positionMode}
            onChange={setPositionMode}
            options={[
              { value: 'random', label: '随机位' },
              { value: 'fixed', label: '拖定位' },
            ]}
          />
          {positionMode === 'fixed' ? (
            <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-medium text-indigo-300">
              第 {(manualPosition ?? 0) + 1} 位
            </span>
          ) : null}
        </div>
        <span className="hidden text-xs text-zinc-500 xl:inline">
          左上角第 1 格是你的视频 · 点击它设置封面和标题 · 干扰封面来自{platform === 'bilibili' ? 'B站' : '油管'}真实热门
        </span>
        <div className="ml-auto flex items-center gap-2">
          {score.rounds > 0 ? <span className="text-xs tabular-nums text-zinc-500">命中 {score.hits}/{score.rounds}</span> : null}
          {phase === 'edit' ? (
            <Button variant="primary" onClick={startRound} disabled={!title || !assetId} title={!title || !assetId ? '先点击左侧第一格设置封面和标题' : undefined}>
              <Play size={14} /> 开始测试
            </Button>
          ) : (
            <Button
              onClick={() => {
                setPhase('edit')
              }}
            >
              停止
            </Button>
          )}
        </div>
      </header>

      {/* 舞台 */}
      <div
        ref={stageRef}
        className={`relative flex min-h-0 flex-1 flex-col p-3 sm:p-4 ${dragActive ? 'cursor-grabbing select-none' : ''}`}
        style={dragActive ? { touchAction: 'none' } : undefined}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
      >
        <DeviceViewport width={viewport.w} height={viewport.h} mobile={device === 'mobile'}>
          <div className="h-full" key={`${seed}-${phase}`}>
            <FeedRenderer
              platform={platform}
              device={device}
              theme={theme}
              feed={feed.items}
              candidateIndex={feed.position}
              frameWidth={viewport.w}
              frameHeight={viewport.h}
              onSelectVideo={
                phase === 'edit'
                  ? (v) => {
                      if (v.kind === 'candidate') setEditorOpen(true)
                    }
                  : phase === 'question'
                    ? answer
                    : undefined
              }
            />
          </div>
        </DeviceViewport>

        {/* 编辑阶段提示角标 */}
        {phase === 'edit' ? (
          <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] text-zinc-300">
            <Pencil size={12} />
            {dragActive
              ? '拖动中 —— 松手放置到目标位置'
              : title && assetId
                ? `已就绪:${title.slice(0, 14)} · 拖动这张卡可调整位置`
                : '点击第 1 格设置封面和标题 · 也可直接拖动它换位置'}
          </div>
        ) : null}

        {phase === 'countdown' ? <CountdownOverlay round={round} onDone={() => setPhase('exposure')} /> : null}
        {exposureBanner}
        {questionBanner}

        {phase === 'exposure' && duration === 0 ? (
          <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
            <Button variant="primary" onClick={() => setPhase('question')}>
              结束展示,开始作答
            </Button>
          </div>
        ) : null}

        {phase === 'result' && lastResult ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b0d11]/90 p-4">
            <div className="w-full max-w-sm rounded-lg border border-[#23252e] bg-[#14161c] p-6 text-center">
              <div className={`text-5xl font-bold ${lastResult.hit ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {lastResult.hit ? '✓' : '○'}
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                {lastResult.hit ? '命中!大家第一眼注意到了你的封面' : '未命中 —— 干扰封面抢走了第一眼'}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                反应 {formatSeconds(lastResult.reactionTime)} · 你的视频位于第 {lastResult.position} 位
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                累计 {score.hits}/{score.rounds} 命中
              </div>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="primary" onClick={startRound}>
                  再来一轮(位置随机)
                </Button>
                <Button
                  onClick={() => {
                    setPhase('edit')
                  }}
                >
                  返回编辑
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 封面/标题编辑器 */}
      <QuickEditorModal
        open={editorOpen}
        title={title}
        channel={channel}
        assetId={assetId}
        assetUrl={assetUrl}
        onClose={() => setEditorOpen(false)}
        onSave={(t, c, a) => {
          setTitle(t)
          setChannel(c)
          setAssetId(a)
          localStorage.setItem(LS_TITLE, t)
          localStorage.setItem(LS_CHANNEL, c)
          if (a) localStorage.setItem(LS_ASSET, a)
          else localStorage.removeItem(LS_ASSET)
          setEditorOpen(false)
          toast.success('已保存,点击右上角「开始测试」')
        }}
      />
    </div>
  )
}

function QuickEditorModal({
  open,
  title,
  channel,
  assetId,
  assetUrl,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  channel: string
  assetId: string | null
  assetUrl: string | null
  onClose: () => void
  onSave: (title: string, channel: string, assetId: string | null) => void
}) {
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftChannel, setDraftChannel] = useState(channel)
  const [draftAsset, setDraftAsset] = useState<string | null>(assetId)
  const [previewUrl, setPreviewUrl] = useState<string | null>(assetUrl)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setDraftTitle(title)
      setDraftChannel(channel)
      setDraftAsset(assetId)
      setPreviewUrl(assetUrl)
    }
  }, [open, title, channel, assetId, assetUrl])

  const pickFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      setSaving(true)
      const asset = await buildStoredAsset(files[0], 'thumbnail', QUICK_PROJECT)
      await assetRepository.put(asset)
      if (draftAsset) void assetRepository.delete(draftAsset).catch(() => undefined)
      setDraftAsset(asset.id)
      setPreviewUrl(URL.createObjectURL(asset.blob))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Modal
      open={open}
      title="设置你的封面和标题"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={saving} onClick={() => onSave(draftTitle.trim(), draftChannel.trim() || '我的频道', draftAsset)}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="mx-auto aspect-video max-w-[420px] overflow-hidden rounded-md bg-black/60 ring-1 ring-[#2f323c]">
          {previewUrl ? (
            <img src={previewUrl} alt="封面预览" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
              <ImageIcon size={30} />
              <span className="text-xs">还没有封面,点击下方按钮上传</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void pickFile(e.target.files)} />
        <div className="flex justify-center">
          <Button onClick={() => fileRef.current?.click()}>
            <ImageIcon size={14} /> {draftAsset ? '更换封面' : '上传封面'}(PNG / JPG / WEBP)
          </Button>
        </div>
        <Field label="标题" hint="就是信息流里显示的那行字">
          <TextInput className="w-full" value={draftTitle} maxLength={100} placeholder="例如:我在全是岩浆的世界生存了100天" onChange={(e) => setDraftTitle(e.target.value)} />
        </Field>
        <Field label="频道名" hint="显示在标题下方">
          <TextInput className="w-full" value={draftChannel} maxLength={40} onChange={(e) => setDraftChannel(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

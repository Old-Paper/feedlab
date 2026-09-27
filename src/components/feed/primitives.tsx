import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { FeedVideo, PlatformEnv } from '../../types'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { getThumbTransform } from '../../lib/crop'
import { makePlaceholderThumb } from '../../mock/generators'
import { useFrameScale } from '../DeviceViewport'
import { countVisibleChars, countWrappedLines } from '../../lib/textMeasure'

// ---------------------------------------------------------------------------
// Thumbnail + avatar primitives shared by all four platform feeds.
// ---------------------------------------------------------------------------

export function ThumbImage({ video, env, className }: { video: FeedVideo; env: PlatformEnv; className?: string }) {
  const assetUrl = useAssetUrl(video.thumbAssetId)
  const src = video.thumbSrc ?? assetUrl ?? makePlaceholderThumb('无封面')
  const transform = video.kind === 'candidate' ? getThumbTransform(video.thumbCrop, env) : undefined
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={className}
      style={transform ? { transform, transformOrigin: 'center center' } : undefined}
    />
  )
}

export function FeedAvatar({ name, assetId, size }: { name: string; assetId?: string; size: number }) {
  const url = useAssetUrl(assetId)
  if (url) {
    return <img src={url} alt="" draggable={false} className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: 'hsl(215, 15%, 38%)', fontSize: size * 0.45 }}
    >
      {(name || '频').slice(0, 1)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inspect Mode — measures the candidate card at its true device-pixel size.
// ---------------------------------------------------------------------------

export interface InspectInfo {
  candidateId: string
  title: string
  displayedWidth: number
  displayedHeight: number
  sourceWidth: number | null
  sourceHeight: number | null
  imageScalePct: number | null
  titleLines: number
  titleClamped: boolean
  visibleChars: number
  totalChars: number
  titleFontSize: number
}

interface InspectContextValue {
  enabled: boolean
  report: (info: InspectInfo | null) => void
}

const InspectContext = createContext<InspectContextValue>({ enabled: false, report: () => {} })

export function InspectProvider({ enabled, report, children }: { enabled: boolean; report: (info: InspectInfo | null) => void; children: ReactNode }) {
  const value = useMemo(() => ({ enabled, report }), [enabled, report])
  return <InspectContext.Provider value={value}>{children}</InspectContext.Provider>
}

/**
 * Wraps ONE feed card (the candidate) and, on hover, measures the rendered
 * thumbnail + title DOM at device scale. Mock cards never get this wrapper,
 * so there is zero visual difference between candidate and distractors.
 */
export function InspectProbe({ video, children, className }: { video: FeedVideo; children: ReactNode; className?: string }) {
  const { enabled, report } = useContext(InspectContext)
  const scale = useFrameScale()
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  if (!video.candidateId) {
    return <div className={className}>{children}</div>
  }

  const measure = () => {
    const root = ref.current
    if (!root || scale <= 0) return
    const thumb = root.querySelector<HTMLElement>('[data-inspect="thumb"]')
    const title = root.querySelector<HTMLElement>('[data-inspect="title"]')
    let displayedWidth = 0
    let displayedHeight = 0
    if (thumb) {
      const rect = thumb.getBoundingClientRect()
      displayedWidth = Math.round(rect.width / scale)
      displayedHeight = Math.round(rect.height / scale)
    }
    let titleLines = 0
    let titleClamped = false
    let visibleChars = 0
    let titleFontSize = 0
    if (title) {
      const cs = window.getComputedStyle(title)
      titleFontSize = parseFloat(cs.fontSize) || 0
      const width = title.clientWidth
      const weight = Number(cs.fontWeight) || 500
      const maxLines = Number(cs.getPropertyValue('-webkit-line-clamp')) || 2
      const needed = countWrappedLines(video.title, width, titleFontSize, weight)
      titleLines = Math.min(needed, maxLines)
      titleClamped = needed > maxLines
      visibleChars = countVisibleChars(video.title, width, titleFontSize, weight, maxLines)
    }
    report({
      candidateId: video.candidateId ?? '',
      title: video.title,
      displayedWidth,
      displayedHeight,
      sourceWidth: video.sourceWidth ?? null,
      sourceHeight: video.sourceHeight ?? null,
      imageScalePct: video.sourceWidth ? (displayedWidth / video.sourceWidth) * 100 : null,
      titleLines,
      titleClamped,
      visibleChars,
      totalChars: video.title.length,
      titleFontSize,
    })
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={() => {
        if (!enabled) return
        setHovered(true)
        measure()
      }}
      onTouchStart={() => {
        // 触屏没有 hover: 点按候选卡即可查看真实显示尺寸, 点其他卡切换
        if (!enabled) return
        setHovered(true)
        measure()
      }}
      onMouseLeave={() => {
        setHovered(false)
        report(null)
      }}
    >
      {children}
      {hovered && enabled ? <div className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-sky-400/60" /> : null}
    </div>
  )
}

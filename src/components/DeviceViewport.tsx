import { clsx } from 'clsx'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

const ScaleContext = createContext(1)

/** Logical pixel scale (pre-CSS-transform) of the nearest DeviceViewport. */
export function useFrameScale(): number {
  return useContext(ScaleContext)
}

function useElementSize(ref: React.RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [ref])
  return size
}

/**
 * Renders an exact WxH "device" and scales it to fit the available area with
 * CSS transform — every px inside stays logically correct (fonts, grid gaps,
 * thumbnail sizes all report their true device-pixel values).
 */
export function DeviceViewport({
  width,
  height,
  children,
  mobile,
  className,
}: {
  width: number
  height: number
  children: ReactNode
  mobile?: boolean
  className?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const avail = useElementSize(wrapRef)
  const [nativeFullscreen, setNativeFullscreen] = useState(false)
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false)
  const fullscreen = nativeFullscreen || fallbackFullscreen
  const pad = mobile ? 8 : 4
  const fitScale =
    avail.width > 0 && avail.height > 0
      ? Math.min((avail.width - pad * 2) / width, (avail.height - pad * 2) / height)
      : 0.2
  const scale = fullscreen ? fitScale : Math.min(1, fitScale)

  useEffect(() => {
    const syncFullscreen = () => setNativeFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    if (!fallbackFullscreen) return
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFallbackFullscreen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fallbackFullscreen])

  const toggleFullscreen = async () => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement === el) await document.exitFullscreen()
    else if (fallbackFullscreen) setFallbackFullscreen(false)
    else if (document.fullscreenEnabled && el.requestFullscreen) {
      try {
        await el.requestFullscreen()
      } catch {
        setFallbackFullscreen(true)
      }
    } else setFallbackFullscreen(true)
  }

  return (
    <div
      ref={wrapRef}
      className={clsx(
        'group/device relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden',
        fullscreen && 'bg-[#050607]',
        fallbackFullscreen && 'fixed inset-0 z-[9999] h-dvh',
        className,
      )}
      data-fullscreen={fullscreen ? 'true' : 'false'}
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-[60] flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-black/75 px-3 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        onClick={(event) => {
          event.stopPropagation()
          void toggleFullscreen()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        title={fullscreen ? '退出全屏 (Esc)' : '全屏预览'}
        aria-label={fullscreen ? '退出全屏' : '全屏预览'}
      >
        {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        <span>{fullscreen ? '退出全屏' : '全屏'}</span>
      </button>

      <div className="flex flex-col items-center gap-1.5">
        <div
          className={clsx(
            'relative overflow-hidden bg-black',
            mobile ? 'rounded-[22px] ring-1 ring-[#3a3d48]' : fullscreen ? 'rounded-none' : 'rounded-lg ring-1 ring-[#2f323c]',
          )}
          style={{ width: width * scale, height: height * scale }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left overflow-hidden"
            style={{ width, height, transform: `scale(${scale})` }}
          >
            <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
          </div>
        </div>
        {!fullscreen ? (
          <div className="text-[11px] tabular-nums text-zinc-600">
            {width} × {height} · 显示 {Math.round(scale * 100)}%
          </div>
        ) : null}
      </div>
    </div>
  )
}

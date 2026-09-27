import { clsx } from 'clsx'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

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
  const pad = mobile ? 8 : 4
  const scale =
    avail.width > 0 && avail.height > 0
      ? Math.min(1, (avail.width - pad * 2) / width, (avail.height - pad * 2) / height)
      : 0.2

  return (
    <div ref={wrapRef} className={clsx('relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden', className)}>
      <div className="flex flex-col items-center gap-1.5">
        <div
          className={clsx(
            'relative overflow-hidden bg-black',
            mobile ? 'rounded-[22px] ring-1 ring-[#3a3d48]' : 'rounded-lg ring-1 ring-[#2f323c]',
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
        <div className="text-[11px] tabular-nums text-zinc-600">
          {width} × {height} · 显示 {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  )
}

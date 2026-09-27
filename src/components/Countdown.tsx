import { useEffect, useState } from 'react'

/** 3-2-1 全屏倒计时。total 省略时只显示"第 N 轮"(简单模式)。 */
export function CountdownOverlay({ round, total, onDone }: { round: number; total?: number; onDone: () => void }) {
  const [n, setN] = useState(3)

  useEffect(() => {
    setN(3)
  }, [round])

  useEffect(() => {
    if (n <= 0) {
      const t = window.setTimeout(onDone, 300)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setN((v) => v - 1), 900)
    return () => window.clearTimeout(t)
  }, [n, onDone])

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[#0b0d11]">
      <div className="text-sm text-zinc-500">{total != null ? `第 ${round} / ${total} 轮` : `第 ${round} 轮`}</div>
      <div key={n} className="animate-pop text-8xl font-bold tabular-nums text-zinc-100">
        {n > 0 ? n : ''}
      </div>
      <div className="text-xs text-zinc-600">看清信息流后凭第一印象作答</div>
    </div>
  )
}

// Greedy text-wrapping measurement used by Inspect Mode. It approximates how
// browsers break CJK (anywhere) and latin text (word boundaries are treated
// loosely, per-character) — close enough to judge legibility at small sizes.

let sharedCtx: CanvasRenderingContext2D | null = null

function getCtx(): CanvasRenderingContext2D | null {
  if (sharedCtx) return sharedCtx
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  sharedCtx = canvas.getContext('2d')
  return sharedCtx
}

export function fontString(fontSize: number, fontWeight: number): string {
  return `${fontWeight} ${fontSize}px Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
}

export function countWrappedLines(
  text: string,
  widthPx: number,
  fontSize: number,
  fontWeight: number,
): number {
  const ctx = getCtx()
  if (!ctx || widthPx <= 0 || text.length === 0) return 1
  ctx.font = fontString(fontSize, fontWeight)
  let lines = 1
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > widthPx && line.length > 0) {
      lines += 1
      line = ch
    } else {
      line = test
    }
  }
  return lines
}

/** How many characters of `text` survive a maxLines clamp at the given width. */
export function countVisibleChars(
  text: string,
  widthPx: number,
  fontSize: number,
  fontWeight: number,
  maxLines: number,
): number {
  const ctx = getCtx()
  if (!ctx || widthPx <= 0 || text.length === 0) return 0
  ctx.font = fontString(fontSize, fontWeight)
  let lines = 1
  let line = ''
  let visible = 0
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > widthPx && line.length > 0) {
      lines += 1
      if (lines > maxLines) break
      line = ch
      visible += 1
    } else {
      line = test
      visible += 1
    }
  }
  return Math.min(visible, text.length)
}

import type { CropState, PlatformEnv } from '../types'
import { clamp } from './format'

/**
 * CSS transform for a cover image inside a 16:9 object-cover container.
 * At zoom 1 the image fills the box exactly; zoom z overflows by (z-1) total,
 * so the pan range is scaled by (z-1)/2 to keep the frame always filled.
 */
export function getThumbTransform(
  crop: Record<PlatformEnv, CropState> | undefined,
  env: PlatformEnv,
): string {
  const c: CropState = crop?.[env] ?? { zoom: 1, x: 0, y: 0 }
  const zoom = clamp(Number(c.zoom) || 1, 1, 3)
  const fx = (zoom - 1) / 2
  const x = clamp(Number(c.x) || 0, -1, 1) * fx
  const y = clamp(Number(c.y) || 0, -1, 1) * fx
  return `translate(${(x * 100).toFixed(2)}%, ${(y * 100).toFixed(2)}%) scale(${zoom.toFixed(3)})`
}

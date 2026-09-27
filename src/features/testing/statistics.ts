// 纯统计计算, 不依赖任何 UI / 存储, 便于单独测试。
// 这里只做基础的比例区间估计与样本量风险提示, 不声称任何科学显著性。

export interface ProportionCI {
  lower: number
  upper: number
}

const Z_90 = 1.6448536269514722
const Z_95 = 1.959963984540054
const Z_99 = 2.5758293035489004

function zFor(confidence: number): number {
  // 允许微小浮点误差
  if (Math.abs(confidence - 0.99) < 1e-6) return Z_99
  if (Math.abs(confidence - 0.9) < 1e-6) return Z_90
  return Z_95
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/**
 * 二项比例的 Wilson Score 置信区间。
 * 相比正态近似, 小样本(以及 0% / 100% 观察值)下表现明显更稳。
 *
 * successes: "成功"次数(如第一眼选择次数)
 * total: 总曝光次数
 * confidence: 置信水平, 默认 0.95
 *
 * total <= 0 时返回 { lower: 0, upper: 0 }, 调用方应把该行视为"无数据"。
 */
export function wilsonInterval(successes: number, total: number, confidence = 0.95): ProportionCI {
  const n = Math.floor(total)
  const s = Math.max(0, Math.min(Math.floor(successes), n))
  if (n <= 0) return { lower: 0, upper: 0 }
  const z = zFor(confidence)
  const p = s / n
  const denom = 1 + (z * z) / n
  const center = (p + (z * z) / (2 * n)) / denom
  const margin = (z / denom) * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)
  return { lower: clamp01(center - margin), upper: clamp01(center + margin) }
}

/** 两个比例区间是否重叠(用于"证据是否足以区分两方案"的温和提示)。 */
export function intervalsOverlap(a: ProportionCI, b: ProportionCI): boolean {
  return a.lower <= b.upper && b.lower <= a.upper
}

export interface SampleSizeHint {
  tone: 'severe' | 'low' | 'ok'
  text: string
}

/** 样本量风险提示 —— 仅是 UI 层面的谨慎提示, 不具备统计学判定意义。 */
export function sampleSizeHint(n: number): SampleSizeHint {
  if (n < 10) return { tone: 'severe', text: '样本量极低，仅供参考' }
  if (n < 30) return { tone: 'low', text: '样本量较低，结果可能存在较大随机波动' }
  return { tone: 'ok', text: '已有一定参考价值' }
}

/** 0.533 -> "53.3%" */
export function formatPercent(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

/** Wilson 区间 -> "36.1%–69.8%" */
export function formatCI(ci: ProportionCI | null | undefined, digits = 1): string {
  if (!ci || !Number.isFinite(ci.lower) || !Number.isFinite(ci.upper)) return '—'
  return `${formatPercent(ci.lower, digits)}–${formatPercent(ci.upper, digits)}`
}

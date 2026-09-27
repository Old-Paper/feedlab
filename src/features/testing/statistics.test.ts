import { describe, expect, it } from 'vitest'
import { formatCI, formatPercent, intervalsOverlap, sampleSizeHint, wilsonInterval } from './statistics'

describe('wilsonInterval', () => {
  it('经典校验: 16/30 → 约 36.1% – 69.8%', () => {
    const ci = wilsonInterval(16, 30)
    expect(ci.lower).toBeCloseTo(0.361, 2)
    expect(ci.upper).toBeCloseTo(0.698, 2)
  })

  it('样本量为 0 时安全返回 {0, 0}, 不出现 NaN / Infinity', () => {
    const ci = wilsonInterval(0, 0)
    expect(ci.lower).toBe(0)
    expect(ci.upper).toBe(0)
    expect(Number.isNaN(ci.lower)).toBe(false)
    expect(Number.isNaN(ci.upper)).toBe(false)
    expect(Number.isFinite(ci.lower)).toBe(true)
    expect(Number.isFinite(ci.upper)).toBe(true)
  })

  it('0/10: 下界为 0 且上界不过度自信', () => {
    const ci = wilsonInterval(0, 10)
    expect(ci.lower).toBe(0)
    expect(ci.upper).toBeGreaterThan(0)
    expect(ci.upper).toBeLessThan(0.4)
  })

  it('10/10: 上界为 1 且下界不过度自信', () => {
    const ci = wilsonInterval(10, 10)
    expect(ci.upper).toBeCloseTo(1, 12)
    expect(ci.lower).toBeGreaterThan(0.6)
  })

  it('小样本 1/5 保持保守 (上界明显小于 100%)', () => {
    const ci = wilsonInterval(1, 5)
    expect(ci.upper).toBeLessThan(0.8)
  })

  it('区间始终落在 [0, 1] 内且下界 <= 上界', () => {
    for (let total = 1; total <= 20; total++) {
      for (let s = 0; s <= total; s++) {
        const ci = wilsonInterval(s, total)
        expect(ci.lower).toBeGreaterThanOrEqual(0)
        expect(ci.upper).toBeLessThanOrEqual(1)
        expect(ci.lower).toBeLessThanOrEqual(ci.upper)
      }
    }
  })

  it('非法输入(successes > total)不会产生 NaN', () => {
    const ci = wilsonInterval(50, 30)
    expect(Number.isNaN(ci.lower)).toBe(false)
    expect(Number.isNaN(ci.upper)).toBe(false)
    expect(ci.upper).toBeCloseTo(1, 12)
  })

  it('置信水平影响区间宽度: 99% 区间比 95% 更宽', () => {
    const ci95 = wilsonInterval(16, 30, 0.95)
    const ci99 = wilsonInterval(16, 30, 0.99)
    expect(ci99.lower).toBeLessThanOrEqual(ci95.lower)
    expect(ci99.upper).toBeGreaterThanOrEqual(ci95.upper)
  })

  it('样本越大区间越窄', () => {
    const small = wilsonInterval(8, 20)
    const large = wilsonInterval(800, 2000)
    expect(large.upper - large.lower).toBeLessThan(small.upper - small.lower)
  })
})

describe('intervalsOverlap', () => {
  it('重叠判定正确', () => {
    expect(intervalsOverlap({ lower: 0.2, upper: 0.6 }, { lower: 0.5, upper: 0.9 })).toBe(true)
    expect(intervalsOverlap({ lower: 0.2, upper: 0.6 }, { lower: 0.6, upper: 0.9 })).toBe(true) // 端点相接视为重叠
    expect(intervalsOverlap({ lower: 0.2, upper: 0.4 }, { lower: 0.5, upper: 0.9 })).toBe(false)
  })
})

describe('sampleSizeHint', () => {
  it('三级提示正确', () => {
    expect(sampleSizeHint(5).tone).toBe('severe')
    expect(sampleSizeHint(5).text).toContain('样本量极低')
    expect(sampleSizeHint(15).tone).toBe('low')
    expect(sampleSizeHint(15).text).toContain('随机波动')
    expect(sampleSizeHint(30).tone).toBe('ok')
    expect(sampleSizeHint(30).text).toContain('参考价值')
    expect(sampleSizeHint(0).tone).toBe('severe')
  })
})

describe('格式化', () => {
  it('formatPercent', () => {
    expect(formatPercent(0.533)).toBe('53.3%')
    expect(formatPercent(0)).toBe('0.0%')
    expect(formatPercent(1)).toBe('100.0%')
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(Number.NaN)).toBe('—')
  })

  it('formatCI', () => {
    expect(formatCI({ lower: 0.361, upper: 0.698 })).toBe('36.1%–69.8%')
    expect(formatCI(null)).toBe('—')
    expect(formatCI({ lower: 0, upper: 0 })).toBe('0.0%–0.0%')
  })
})

import { describe, expect, it } from 'vitest'
import { RandomEngine, jitterInt, randomSeed } from './randomEngine'

describe('RandomEngine', () => {
  it('相同 seed 生成完全相同的随机序列', () => {
    const a = new RandomEngine('feedlab-seed')
    const b = new RandomEngine('feedlab-seed')
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('不同 seed 通常生成不同序列', () => {
    const a = new RandomEngine('seed-a')
    const b = new RandomEngine('seed-b')
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('next() 始终在 [0, 1) 内', () => {
    const rng = new RandomEngine('range-check')
    for (let i = 0; i < 500; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int(min, maxExclusive) 范围正确且含头不含尾', () => {
    const rng = new RandomEngine('int-range')
    for (let i = 0; i < 300; i++) {
      const v = rng.int(3, 10)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(10)
      expect(Number.isInteger(v)).toBe(true)
    }
    // 退化区间: max <= min 时恒等于 min
    expect(rng.int(5, 5)).toBe(5)
    expect(rng.int(9, 2)).toBe(9)
  })

  it('shuffle 不丢元素、不重复、原数组不被修改', () => {
    const rng = new RandomEngine('shuffle-check')
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const snapshot = [...original]
    const shuffled = rng.shuffle(original)
    expect(shuffled).toHaveLength(original.length)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(snapshot)
    expect(original).toEqual(snapshot)
  })

  it('相同 seed 的 shuffle 结果可复现', () => {
    const input = Array.from({ length: 30 }, (_, i) => i)
    const a = new RandomEngine('same-seed-shuffle').shuffle(input)
    const b = new RandomEngine('same-seed-shuffle').shuffle(input)
    expect(a).toEqual(b)
  })

  it('randomSeed 生成非空字符串且不重复', () => {
    const s1 = randomSeed()
    const s2 = randomSeed()
    expect(s1.length).toBeGreaterThan(0)
    expect(s1).not.toBe(s2)
  })

  it('jitterInt 结果为有限整数且 >= 1', () => {
    const rng = new RandomEngine('jitter-check')
    for (let i = 0; i < 100; i++) {
      const v = jitterInt(rng, 500, 0.5, 2)
      expect(Number.isFinite(v)).toBe(true)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
    }
  })
})

import { fisherYatesShuffle } from './shuffle'

/** cyrb128 string hash -> 4 uint32s, used to seed the PRNG. */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  return [(h1 >>> 0), (h2 >>> 0), (h3 >>> 0), (h4 >>> 0)]
}

/**
 * Deterministic, seedable PRNG (sfc32). Identical seed => identical number
 * sequence, so "same seed + same project config" always yields the same feed.
 */
export class RandomEngine {
  private a: number
  private b: number
  private c: number
  private d: number

  constructor(seed: string) {
    const [a, b, c, d] = cyrb128(seed)
    this.a = a
    this.b = b
    this.c = c
    this.d = d
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.a >>>= 0
    this.b >>>= 0
    this.c >>>= 0
    this.d >>>= 0
    let t = (this.a + this.b) | 0
    this.a = this.b ^ (this.b >>> 9)
    this.b = (this.c + (this.c << 3)) | 0
    this.c = (this.c << 21) | (this.c >>> 11)
    this.d = (this.d + 1) | 0
    t = (t + this.d) | 0
    this.c = (this.c + t) | 0
    return (t >>> 0) / 4294967296
  }

  /** Uniform integer in [min, maxExclusive). */
  int(min: number, maxExclusive: number): number {
    if (maxExclusive <= min) return min
    return min + Math.floor(this.next() * (maxExclusive - min))
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length)]
  }

  bool(p = 0.5): boolean {
    return this.next() < p
  }

  /** Fisher-Yates on a copy; the input array is never mutated. */
  shuffle<T>(arr: readonly T[]): T[] {
    return fisherYatesShuffle(arr, this)
  }
}

/** Cryptographically-random short seed string for a new test run. */
export function randomSeed(): string {
  const c = globalThis.crypto
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(2)
    c.getRandomValues(buf)
    return `${buf[0].toString(36)}${buf[1].toString(36)}`
  }
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e12).toString(36)}`
}

/** Multiply `base` by a random factor in [minF, maxF), clamped to >= 1. */
export function jitterInt(rng: RandomEngine, base: number, minF: number, maxF: number): number {
  return Math.max(1, Math.round(base * rng.range(minF, maxF)))
}

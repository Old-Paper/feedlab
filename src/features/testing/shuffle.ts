import type { RandomEngine } from './randomEngine'

/**
 * Classic Fisher-Yates shuffle. Returns a new array; the input is untouched.
 * Every permutation is equally likely for a uniform PRNG.
 */
export function fisherYatesShuffle<T>(arr: readonly T[], rng: RandomEngine): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i + 1)
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

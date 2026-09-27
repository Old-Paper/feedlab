import { create } from 'zustand'
import type {
  BlindDuration,
  Candidate,
  DistractorCategory,
  Platform,
  PositionMode,
  Project,
  ThemeMode,
  Device,
} from '../types'
import { randomSeed } from '../features/testing/randomEngine'

export type ABLayout = 'horizontal' | 'vertical' | 'toggle'

export interface SimulationState {
  projectId: string | null
  platform: Platform
  device: Device
  theme: ThemeMode
  viewportPresetId: string
  viewportWidth: number
  viewportHeight: number
  mockCount: number
  randomizeFeedOrder: boolean
  randomizeMetadata: boolean
  positionMode: PositionMode
  fixedPosition: number
  useFixedSeed: boolean
  seed: string
  useRealPool: boolean
  distractorCategory: DistractorCategory
  inspectEnabled: boolean
  candidateId: string | null
  ytMobileStyle: 'standard' | 'experimental'
  abLayout: ABLayout
  abCandidateA: string | null
  abCandidateB: string | null
  blindDuration: BlindDuration
  rounds: number
  candidateScope: 'all' | 'single'
  singleCandidateId: string | null
  initFromProject: (p: Project) => void
  patch: (partial: Partial<SimulationState>) => void
  /** Re-rolls the seed unless it is pinned (fixed seed stays reproducible). */
  shuffle: () => void
  rollSeed: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  projectId: null,
  platform: 'youtube',
  device: 'desktop',
  theme: 'light',
  viewportPresetId: '1920x1080',
  viewportWidth: 1920,
  viewportHeight: 1080,
  mockCount: 12,
  randomizeFeedOrder: true,
  randomizeMetadata: true,
  positionMode: 'random',
  fixedPosition: 3,
  useFixedSeed: false,
  seed: randomSeed(),
  useRealPool: false,
  distractorCategory: 'normal',
  inspectEnabled: false,
  candidateId: null,
  ytMobileStyle: 'standard',
  abLayout: 'horizontal',
  abCandidateA: null,
  abCandidateB: null,
  blindDuration: 5,
  rounds: 10,
  candidateScope: 'all',
  singleCandidateId: null,

  initFromProject: (p) => {
    const sameProject = get().projectId === p.id
    const s = p.testSettings
    const enabled = p.candidates.filter((c) => c.enabled)
    const cur = get()
    const patch: Partial<SimulationState> = { projectId: p.id }

    if (!sameProject) {
      Object.assign(patch, {
        platform: s.platform,
        device: s.device,
        theme: s.theme,
        viewportPresetId: s.viewportPresetId,
        viewportWidth: s.viewportWidth,
        viewportHeight: s.viewportHeight,
        mockCount: s.mockCount,
        randomizeFeedOrder: s.randomizeFeedOrder,
        randomizeMetadata: s.randomizeMetadata,
        positionMode: s.positionMode,
        fixedPosition: s.fixedPosition,
        useFixedSeed: s.useFixedSeed,
        seed: s.seed || randomSeed(),
        useRealPool: s.useRealPool,
        distractorCategory: s.distractorCategory,
        blindDuration: s.blindDuration,
        rounds: s.rounds,
        candidateScope: s.candidateScope,
        singleCandidateId: s.singleCandidateId ?? enabled[0]?.id ?? null,
      })
    }

    // Heal candidate selections whenever they point at nothing valid
    // (e.g. candidates were created after this store was initialized).
    const valid = (id: string | null) => !!id && enabled.some((c) => c.id === id)
    if (!valid(cur.candidateId)) patch.candidateId = enabled[0]?.id ?? null
    if (!valid(cur.abCandidateA)) patch.abCandidateA = enabled[0]?.id ?? null
    if (!valid(cur.abCandidateB)) patch.abCandidateB = enabled[1]?.id ?? null
    if (!sameProject || !valid(cur.singleCandidateId)) {
      patch.singleCandidateId =
        s.candidateScope === 'single' && valid(s.singleCandidateId) ? s.singleCandidateId : enabled[0]?.id ?? null
    }
    set(patch)
  },

  patch: (partial) => set(partial),

  shuffle: () => {
    if (get().useFixedSeed) return
    set({ seed: randomSeed() })
  },

  rollSeed: () => set({ seed: randomSeed() }),
}))

/** Resolves the candidate slot for preview-style feeds (seed-derived when random). */
export function resolvePreviewPosition(
  sim: Pick<SimulationState, 'positionMode' | 'fixedPosition'>,
  totalSlots: number,
  seed: string,
  derivePosition: (seed: string, total: number) => number,
): number {
  if (sim.positionMode === 'fixed') {
    return Math.min(Math.max(sim.fixedPosition - 1, 0), Math.max(totalSlots - 1, 0))
  }
  return derivePosition(seed, Math.max(totalSlots, 1))
}

export function pickCandidatesForTest(
  project: Project,
  sim: Pick<SimulationState, 'candidateScope' | 'singleCandidateId'>,
): Candidate[] {
  const enabled = project.candidates.filter((c) => c.enabled)
  if (sim.candidateScope === 'single' && sim.singleCandidateId) {
    const found = enabled.filter((c) => c.id === sim.singleCandidateId)
    if (found.length > 0) return found
  }
  return enabled
}

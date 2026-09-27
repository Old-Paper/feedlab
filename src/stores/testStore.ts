import { create } from 'zustand'
import type { TestMode, TestSession } from '../types'
import { sessionRepository } from '../db/repositories/sessionRepository'
import { toast } from './toastStore'
import { errorMessage } from '../lib/format'

export type TestPhase = 'idle' | 'countdown' | 'exposure' | 'question' | 'ready' | 'running' | 'flash' | 'finished'

export interface RoundResult {
  round: number
  candidateId: string | null
  targetClicked: boolean
  reactionTime: number | null
  wrongClicks: number
}

interface TestState {
  mode: TestMode | null
  phase: TestPhase
  /** 0-based index into plans. */
  roundIndex: number
  plans: Array<{ round: number; candidateId: string | null; position: number; seed: string }>
  results: RoundResult[]
  lastResult: RoundResult | null
  /** Interaction lockout so double clicks cannot double-record. */
  recording: boolean

  startTest: (mode: TestMode, plans: TestState['plans']) => void
  setPhase: (phase: TestPhase) => void
  submitRound: (session: TestSession, result: RoundResult) => Promise<void>
  advance: () => void
  stopTest: () => void
}

export const useTestStore = create<TestState>((set, get) => ({
  mode: null,
  phase: 'idle',
  roundIndex: 0,
  plans: [],
  results: [],
  lastResult: null,
  recording: false,

  startTest: (mode, plans) => {
    set({
      mode,
      plans,
      roundIndex: 0,
      results: [],
      lastResult: null,
      recording: false,
      phase: mode === 'blind' ? 'countdown' : 'ready',
    })
  },

  setPhase: (phase) => set({ phase }),

  submitRound: async (session, result) => {
    if (get().recording) return
    set({ recording: true })
    try {
      await sessionRepository.add(session)
    } catch (e) {
      toast.error(`保存测试记录失败:${errorMessage(e)}`)
    }
    const results = [...get().results, result]
    set({
      results,
      lastResult: result,
      phase: 'flash',
      recording: false,
    })
  },

  advance: () => {
    const { roundIndex, plans } = get()
    const next = roundIndex + 1
    if (next >= plans.length) {
      set({ phase: 'finished' })
    } else {
      set({ roundIndex: next, phase: get().mode === 'blind' ? 'countdown' : 'ready' })
    }
  },

  stopTest: () => {
    set({ mode: null, phase: 'idle', roundIndex: 0, plans: [], lastResult: null, recording: false })
  },
}))

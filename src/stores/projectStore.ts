import { create } from 'zustand'
import type { Project, TestSettings } from '../types'
import { projectRepository } from '../db/repositories/projectRepository'
import { randomSeed } from '../features/testing/randomEngine'
import { toast } from './toastStore'

export function defaultTestSettings(): TestSettings {
  return {
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
    blindDuration: 5,
    rounds: 10,
    candidateScope: 'all',
    singleCandidateId: null,
  }
}

export function createProjectDoc(name: string, settings?: Partial<TestSettings>): Project {
  const now = Date.now()
  return {
    id: crypto.randomUUID().replace(/-/g, '').slice(0, 20),
    name,
    createdAt: now,
    updatedAt: now,
    thumbnails: [],
    titles: [],
    candidates: [],
    channel: {
      name: '我的频道',
      avatarAssetId: null,
      youtube: {
        channelName: '',
        views: 128000,
        danmaku: 0,
        durationSec: 615,
        publishedHoursAgo: 26,
      },
      bilibili: {
        uploaderName: '',
        views: 96000,
        danmaku: 2100,
        durationSec: 542,
        publishedHoursAgo: 20,
      },
      metadataMode: 'fixed',
    },
    testSettings: { ...defaultTestSettings(), ...settings },
    mockVideos: [],
    disabledBuiltinMockIds: [],
  }
}

interface ProjectState {
  project: Project | null
  loading: boolean
  error: string | null
  loadProject: (id: string) => Promise<void>
  closeProject: () => void
  updateProject: (mutator: (p: Project) => void) => void
  reload: () => Promise<void>
}

let persistTimer: number | undefined
let pendingProject: Project | null = null

async function persist(project: Project): Promise<void> {
  try {
    await projectRepository.put(project)
  } catch (e) {
    toast.error(`保存项目失败(可能存储空间不足):${e instanceof Error ? e.message : String(e)}`)
  }
}

function schedulePersist(project: Project): void {
  pendingProject = project
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    const p = pendingProject
    pendingProject = null
    if (p) void persist(p)
  }, 350)
}

function flushPersist(): void {
  window.clearTimeout(persistTimer)
  const p = pendingProject
  pendingProject = null
  if (p) void persist(p)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPersist)
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  loading: false,
  error: null,
  loadProject: async (id) => {
    flushPersist()
    set({ loading: true, error: null })
    try {
      const p = await projectRepository.get(id)
      if (!p) {
        set({ project: null, loading: false, error: '项目不存在或已被删除' })
      } else {
        set({ project: p, loading: false })
      }
    } catch (e) {
      set({ loading: false, error: `读取项目失败:${e instanceof Error ? e.message : String(e)}` })
    }
  },
  closeProject: () => {
    flushPersist()
    set({ project: null, error: null })
  },
  updateProject: (mutator) => {
    const current = get().project
    if (!current) return
    const next = structuredClone(current)
    mutator(next)
    next.updatedAt = Date.now()
    set({ project: next })
    schedulePersist(next)
  },
  reload: async () => {
    const id = get().project?.id
    if (id) await get().loadProject(id)
  },
}))

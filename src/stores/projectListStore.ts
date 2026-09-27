import { create } from 'zustand'
import type { Project } from '../types'
import { projectRepository } from '../db/repositories/projectRepository'
import { createProjectDoc } from './projectStore'
import { useSettingsStore } from './settingsStore'
import { toast } from './toastStore'
import { errorMessage } from '../lib/format'

export interface ProjectSummary {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnailCount: number
  titleCount: number
  candidateCount: number
}

function toSummary(p: Project): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    thumbnailCount: p.thumbnails.length,
    titleCount: p.titles.length,
    candidateCount: p.candidates.length,
  }
}

interface ProjectListState {
  projects: ProjectSummary[]
  loading: boolean
  loaded: boolean
  load: () => Promise<void>
  create: (name?: string) => Promise<string | null>
  duplicate: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useProjectListStore = create<ProjectListState>((set, get) => ({
  projects: [],
  loading: false,
  loaded: false,
  load: async () => {
    set({ loading: true })
    try {
      const all = await projectRepository.list()
      set({ projects: all.map(toSummary), loading: false, loaded: true })
    } catch (e) {
      toast.error(`读取项目列表失败:${errorMessage(e)}`)
      set({ loading: false, loaded: true })
    }
  },
  create: async (name) => {
    const app = useSettingsStore.getState().settings
    const project = createProjectDoc(name?.trim() || '未命名测试项目', {
      platform: app.defaultPlatform,
      device: app.defaultDevice,
      theme: app.defaultTheme,
      viewportPresetId: app.defaultDevice === 'desktop' ? '1920x1080' : '390x844',
      viewportWidth: app.defaultDevice === 'desktop' ? 1920 : 390,
      viewportHeight: app.defaultDevice === 'desktop' ? 1080 : 844,
    })
    try {
      await projectRepository.put(project)
      await get().load()
      return project.id
    } catch (e) {
      toast.error(`创建项目失败:${errorMessage(e)}`)
      return null
    }
  },
  duplicate: async (id) => {
    try {
      await projectRepository.duplicate(id)
      await get().load()
      toast.success('已复制项目')
    } catch (e) {
      toast.error(`复制失败:${errorMessage(e)}`)
    }
  },
  remove: async (id) => {
    try {
      await projectRepository.delete(id)
      await get().load()
      toast.success('项目已删除')
    } catch (e) {
      toast.error(`删除失败:${errorMessage(e)}`)
    }
  },
}))

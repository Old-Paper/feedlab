import { create } from 'zustand'
import type { ThemeMode, Platform, Device } from '../types'
import { settingsRepository } from '../db/repositories/settingsRepository'

export interface AppSettings {
  defaultPlatform: Platform
  defaultDevice: Device
  defaultTheme: ThemeMode
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultPlatform: 'youtube',
  defaultDevice: 'desktop',
  defaultTheme: 'light',
}

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  patch: (partial: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_APP_SETTINGS },
  loaded: false,
  load: async () => {
    const saved = await settingsRepository.get<Partial<AppSettings>>('app', {})
    set({ settings: { ...DEFAULT_APP_SETTINGS, ...saved }, loaded: true })
  },
  patch: async (partial) => {
    const next = { ...get().settings, ...partial }
    set({ settings: next })
    await settingsRepository.set('app', next)
  },
}))

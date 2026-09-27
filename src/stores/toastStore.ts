import { create } from 'zustand'
import { uid } from '../lib/id'

export interface ToastItem {
  id: string
  kind: 'info' | 'success' | 'error'
  text: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastItem['kind'], text: string) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, text) => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }].slice(-4) }))
    window.setTimeout(() => get().dismiss(id), 3600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  info: (text: string) => useToastStore.getState().push('info', text),
  success: (text: string) => useToastStore.getState().push('success', text),
  error: (text: string) => useToastStore.getState().push('error', text),
}

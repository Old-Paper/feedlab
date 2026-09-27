import type { FeedVideo, ThemeMode } from '../types'

// YouTube 前端使用 Roboto + 系统中文回退 (官网在本机不可直连, 按线上 CSS 已知值校准)
export const YT_FONT = `Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
export const BILI_FONT = `"PingFang SC", "HarmonyOS Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif`

export interface FeedTheme {
  pageBg: string
  surface: string
  headerBg: string
  border: string
  textPrimary: string
  textSecondary: string
  accent: string
  accentText: string
  chipBg: string
  chipActiveBg: string
  chipActiveText: string
  searchBg: string
  searchBorder: string
  badgeBg: string
  badgeText: string
  hoverBg: string
  navBg: string
  navInactive: string
  sidebarBg: string
}

export interface FeedProps {
  feed: FeedVideo[]
  candidateIndex: number
  theme: ThemeMode
  frameWidth: number
  frameHeight: number
  /** Present only during answer phases; the target card never looks different. */
  onSelectVideo?: (v: FeedVideo) => void
  ytMobileStyle?: 'standard' | 'experimental'
}

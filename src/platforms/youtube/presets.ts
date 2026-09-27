import type { ThemeMode } from '../../types'
import { YT_FONT, type FeedTheme } from '../types'

export interface YouTubeThemePalette extends FeedTheme {}

const light: YouTubeThemePalette = {
  pageBg: '#ffffff',
  surface: '#f2f2f2',
  headerBg: '#ffffff',
  border: '#e5e5e5',
  textPrimary: '#0f0f0f',
  textSecondary: '#606060',
  accent: '#ff0000',
  accentText: '#ffffff',
  chipBg: '#f2f2f2',
  chipActiveBg: '#0f0f0f',
  chipActiveText: '#ffffff',
  searchBg: '#ffffff',
  searchBorder: '#cccccc',
  badgeBg: 'rgba(0, 0, 0, 0.8)',
  badgeText: '#ffffff',
  hoverBg: 'rgba(0, 0, 0, 0.05)',
  navBg: '#ffffff',
  navInactive: '#606060',
  sidebarBg: '#ffffff',
}

const dark: YouTubeThemePalette = {
  pageBg: '#0f0f0f',
  surface: '#272727',
  headerBg: '#0f0f0f',
  border: '#303030',
  textPrimary: '#f1f1f1',
  textSecondary: '#aaaaaa',
  accent: '#ff0000',
  accentText: '#ffffff',
  chipBg: '#272727',
  chipActiveBg: '#f1f1f1',
  chipActiveText: '#0f0f0f',
  searchBg: '#121212',
  searchBorder: '#303030',
  badgeBg: 'rgba(0, 0, 0, 0.8)',
  badgeText: '#f1f1f1',
  hoverBg: 'rgba(255, 255, 255, 0.1)',
  navBg: '#0f0f0f',
  navInactive: '#aaaaaa',
  sidebarBg: '#0f0f0f',
}

export const YT_THEMES: Record<ThemeMode, YouTubeThemePalette> = { light, dark }

export interface YouTubeDesktopPreset {
  font: string
  headerHeight: number
  sidebarWidth: number
  miniSidebarWidth: number
  /** 实测 1366/1920/2560 侧栏均为展开 240px,更窄才收起 */
  sidebarAutoExpandMin: number
  chipsHeight: number
  contentPaddingX: number
  /** 实测首页固定 3 列大卡(1366→344px / 1920→528px / 2560→700px),列间 40 行距 36 */
  columns: number
  gridGapX: number
  gridGapY: number
  thumbnailRadius: number
  titleFontSize: number
  titleLineHeight: number
  titleLines: number
  titleWeight: number
  metaFontSize: number
  metaLineHeight: number
  avatarSize: number
  durationFontSize: number
  searchMaxWidth: number
  chips: string[]
}

export const YOUTUBE_DESKTOP_PRESET: YouTubeDesktopPreset = {
  font: YT_FONT,
  headerHeight: 56,
  sidebarWidth: 240,
  miniSidebarWidth: 72,
  sidebarAutoExpandMin: 1312,
  chipsHeight: 56,
  contentPaddingX: 24,
  columns: 3,
  gridGapX: 40,
  gridGapY: 36,
  thumbnailRadius: 12,
  titleFontSize: 16,
  titleLineHeight: 22,
  titleLines: 2,
  titleWeight: 500,
  metaFontSize: 14,
  metaLineHeight: 20,
  avatarSize: 36,
  durationFontSize: 12,
  searchMaxWidth: 540,
  chips: ['全部', '音乐', '游戏', '直播', '编程', '动画', '新闻', '播客', '纪录片', '实况', 'Mixes', '最新上传', '新内容', '观看过的'],
}

export interface YouTubeMobilePreset {
  font: string
  headerHeight: number
  chipsHeight: number
  bottomNavHeight: number
  thumbnailRadius: number
  titleFontSize: number
  titleLineHeight: number
  titleLines: number
  titleWeight: number
  metaFontSize: number
  metaLineHeight: number
  /** 频道行 + 播放量·时间行 与标题左缘对齐的缩进 (头像 + 间距) */
  metaIndent: number
  avatarSize: number
  paddingX: number
  showChips: boolean
  bottomNavLabels: boolean
  durationFontSize: number
}

// 卡片数值按 m.youtube.com (390×844) 线上实测: 缩略图圆角 12、标题 16px/22 weight 500
// clamp 2、meta 14px/20 两行(频道行 + 播放量·时间行,与标题对齐)、头像 40。
export const YOUTUBE_MOBILE_PRESETS: Record<'standard' | 'experimental', YouTubeMobilePreset> = {
  standard: {
    font: YT_FONT,
    headerHeight: 56,
    chipsHeight: 44,
    bottomNavHeight: 56,
    thumbnailRadius: 12,
    titleFontSize: 16,
    titleLineHeight: 22,
    titleLines: 2,
    titleWeight: 500,
    metaFontSize: 14,
    metaLineHeight: 20,
    metaIndent: 52,
    avatarSize: 40,
    paddingX: 12,
    showChips: true,
    bottomNavLabels: true,
    durationFontSize: 12,
  },
  experimental: {
    font: YT_FONT,
    headerHeight: 56,
    chipsHeight: 44,
    bottomNavHeight: 56,
    thumbnailRadius: 16,
    titleFontSize: 15,
    titleLineHeight: 20,
    titleLines: 2,
    titleWeight: 600,
    metaFontSize: 13,
    metaLineHeight: 18,
    metaIndent: 48,
    avatarSize: 36,
    paddingX: 12,
    showChips: false,
    bottomNavLabels: false,
    durationFontSize: 12,
  },
}

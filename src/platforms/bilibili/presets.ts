import type { ThemeMode } from '../../types'
import { type FeedTheme } from '../types'

// 字体栈直接取自 bilibili.com 线上 computed style (2026-09 实测)
export const BILI_FONT = `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`

export interface BilibiliThemePalette extends FeedTheme {}

// 颜色取自 bilibili.com 线上实测: 页面底 rgb(241,242,243), 标题 rgb(24,25,28),
// 次要文字 rgb(148,153,160), 分类 pill 背景 rgb(246,247,248) 文字 rgb(97,102,109)
const light: BilibiliThemePalette = {
  pageBg: '#f1f2f3',
  surface: '#ffffff',
  headerBg: '#ffffff',
  border: '#e3e5e7',
  textPrimary: '#18191c',
  textSecondary: '#9499a0',
  accent: '#fb7299',
  accentText: '#ffffff',
  chipBg: '#f6f7f8',
  chipActiveBg: '#fb7299',
  chipActiveText: '#ffffff',
  searchBg: '#f1f2f3',
  searchBorder: '#e3e5e7',
  badgeBg: 'rgba(0, 0, 0, 0.55)',
  badgeText: '#ffffff',
  hoverBg: 'rgba(0, 0, 0, 0.04)',
  navBg: '#ffffff',
  navInactive: '#61666d',
  sidebarBg: '#ffffff',
}

const dark: BilibiliThemePalette = {
  pageBg: '#111214',
  surface: '#1e2022',
  headerBg: '#18191c',
  border: '#2d2f33',
  textPrimary: '#e3e5e7',
  textSecondary: '#9499a0',
  accent: '#fb7299',
  accentText: '#ffffff',
  chipBg: '#26282b',
  chipActiveBg: '#fb7299',
  chipActiveText: '#ffffff',
  searchBg: '#000000',
  searchBorder: '#2d2f33',
  badgeBg: 'rgba(0, 0, 0, 0.6)',
  badgeText: '#ffffff',
  hoverBg: 'rgba(255, 255, 255, 0.06)',
  navBg: '#18191c',
  navInactive: '#9499a0',
  sidebarBg: '#18191c',
}

export const BILI_THEMES: Record<ThemeMode, BilibiliThemePalette> = { light, dark }

export interface BilibiliDesktopPreset {
  font: string
  /** 实测 header 64px (bili-header__bar) */
  headerHeight: number
  /** 分类入口两行 pill: 实测 pill 高 32 / 圆角 6 / gap 10 / 字 14 #61666d bg #f6f7f8 */
  pillHeight: number
  pillGap: number
  pillRows: number
  /** 实测推荐网格: 卡宽 309px 固定列 + gap 20, 容器居中 (1920 视口 5 列) */
  cardWidth: number
  gridGapX: number
  gridGapY: number
  thumbnailRadius: number
  /** 实测标题 15px / 22px / weight 400 / #18191c / clamp 2 / padding-right 30 */
  titleFontSize: number
  titleLineHeight: number
  titleLines: number
  titleWeight: number
  titlePaddingRight: number
  infoMarginTop: number
  /** 实测 UP 行 13px / 17px / #9499a0 / margin-top 4, UP 左 + 日期右 */
  metaFontSize: number
  metaLineHeight: number
  metaMarginTop: number
  /** 实测图内 stats: 13px / 18px 白字, padding 16px 8px 6px, item 间 12px */
  statsFontSize: number
  statsLineHeight: number
  durationFontSize: number
  searchMaxWidth: number
  navLinks: string[]
  chipsRow1: string[]
  chipsRow2: string[]
  sideLinks: string[]
  rightEntryLinks: string[]
}

export const BILIBILI_DESKTOP_PRESET: BilibiliDesktopPreset = {
  font: BILI_FONT,
  headerHeight: 64,
  pillHeight: 32,
  pillGap: 10,
  pillRows: 2,
  cardWidth: 309,
  gridGapX: 20,
  gridGapY: 20,
  thumbnailRadius: 6,
  titleFontSize: 15,
  titleLineHeight: 22,
  titleLines: 2,
  titleWeight: 400,
  titlePaddingRight: 30,
  infoMarginTop: 10,
  metaFontSize: 13,
  metaLineHeight: 17,
  metaMarginTop: 4,
  statsFontSize: 13,
  statsLineHeight: 18,
  durationFontSize: 13,
  searchMaxWidth: 420,
  navLinks: ['首页', '番剧', '直播', '游戏中心', '会员购', '漫画', '赛事', '下载客户端'],
  chipsRow1: ['番剧', '国创', '综艺', '动画', '鬼畜', '舞蹈', '娱乐', '科技数码', '美食', '汽车', '运动', 'vlog'],
  chipsRow2: ['电影', '电视剧', '纪录片', '游戏', '音乐', '影视', '知识', '资讯', '小剧场', '时尚美妆', '动物', '更多'],
  sideLinks: ['专栏', '活动', '社区中心'],
  rightEntryLinks: ['大会员', '消息', '动态', '收藏', '历史', '创作中心'],
}

export interface BilibiliMobilePreset {
  font: string
  /** m.bilibili.com 顶部导航条 */
  navRowHeight: number
  bottomNavHeight: number
  gridColumns: number
  /** APP 风格紧凑间距 (m 站设计语言, 卡宽随视口自适应) */
  contentPaddingX: number
  gridGapX: number
  gridGapY: number
  thumbnailRadius: number
  /** m.bilibili.com 实测: 标题 15px/22px weight 400 clamp 2 padding-right 30 */
  titleFontSize: number
  titleLineHeight: number
  titleLines: number
  titleWeight: number
  titlePaddingRight: number
  infoMarginTop: number
  /** m.bilibili.com 实测: UP 行 13px/17px #9499a0 margin-top 4 */
  metaFontSize: number
  metaLineHeight: number
  metaMarginTop: number
  /** m.bilibili.com 实测: 图内 stats 13px/18px 白字 padding 16px 8px 6px */
  statsFontSize: number
  statsLineHeight: number
  durationFontSize: number
  navLinks: string[]
}

export const BILIBILI_MOBILE_PRESET: BilibiliMobilePreset = {
  font: BILI_FONT,
  navRowHeight: 48,
  bottomNavHeight: 50,
  gridColumns: 2,
  contentPaddingX: 8,
  gridGapX: 8,
  gridGapY: 12,
  thumbnailRadius: 6,
  titleFontSize: 15,
  titleLineHeight: 22,
  titleLines: 2,
  titleWeight: 400,
  titlePaddingRight: 30,
  infoMarginTop: 8,
  metaFontSize: 13,
  metaLineHeight: 17,
  metaMarginTop: 4,
  statsFontSize: 13,
  statsLineHeight: 18,
  durationFontSize: 13,
  navLinks: ['首页', '番剧', '直播', '游戏中心', '会员购', '漫画', '赛事'],
}

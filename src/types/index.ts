// ---------------------------------------------------------------------------
// Domain models for FeedLab.
// Blob data lives in the `assets` table; every other doc references blobs by
// assetId so project documents stay small and JSON-serializable.
// ---------------------------------------------------------------------------

export type Platform = 'youtube' | 'bilibili'
export type Device = 'desktop' | 'mobile'
export type ThemeMode = 'light' | 'dark'
export type PlatformEnv = 'youtube-desktop' | 'youtube-mobile' | 'bilibili-desktop' | 'bilibili-mobile'
export type TestMode = 'blind' | 'find'
export type PositionMode = 'random' | 'fixed'
export type MetadataMode = 'fixed' | 'random'
/**
 * 竞争环境: 干扰视频来自哪一类竞争池。
 * - site: 全站生态(内置干扰库或每日真实热门池)
 * - minecraft: Minecraft 分区
 * - competitors: 我的竞品库(用户自己导入的竞品视频)
 * 未来可扩展更多关键词分区(gaming 等), 本次不实现。
 */
export type CompetitionEnvironment = 'site' | 'minecraft' | 'competitors'
/** Seconds a feed stays visible during a blind test. 0 = unlimited. */
export type BlindDuration = 3 | 5 | 10 | 0

export function platformEnvKey(platform: Platform, device: Device): PlatformEnv {
  return `${platform}-${device}` as PlatformEnv
}

// --- Viewports -------------------------------------------------------------

export interface ViewportPreset {
  id: string
  width: number
  height: number
  label: string
}

export const DESKTOP_VIEWPORTS: ViewportPreset[] = [
  { id: '1366x768', width: 1366, height: 768, label: '1366 × 768' },
  { id: '1920x1080', width: 1920, height: 1080, label: '1920 × 1080' },
  { id: '2560x1440', width: 2560, height: 1440, label: '2560 × 1440' },
]

export const MOBILE_VIEWPORTS: ViewportPreset[] = [
  { id: '360x800', width: 360, height: 800, label: '360 × 800' },
  { id: '390x844', width: 390, height: 844, label: '390 × 844' },
  { id: '393x873', width: 393, height: 873, label: '393 × 873' },
  { id: '430x932', width: 430, height: 932, label: '430 × 932' },
]

// --- Project entities ------------------------------------------------------

export interface CropState {
  zoom: number
  x: number
  y: number
}

export const DEFAULT_CROP: CropState = { zoom: 1, x: 0, y: 0 }

export function defaultCrops(): Record<PlatformEnv, CropState> {
  return {
    'youtube-desktop': { ...DEFAULT_CROP },
    'youtube-mobile': { ...DEFAULT_CROP },
    'bilibili-desktop': { ...DEFAULT_CROP },
    'bilibili-mobile': { ...DEFAULT_CROP },
  }
}

export interface ThumbnailItem {
  id: string
  name: string
  assetId: string
  width: number
  height: number
  createdAt: number
  order: number
  /** Independent crop per platform environment. */
  crop: Record<PlatformEnv, CropState>
}

export interface TitleItem {
  id: string
  text: string
  order: number
  createdAt: number
}

export interface CandidateMetadataOverride {
  views?: number
  danmaku?: number
  durationSec?: number
  publishedHoursAgo?: number
}

export interface Candidate {
  id: string
  name: string
  thumbnailId: string | null
  titleId: string | null
  enabled: boolean
  createdAt: number
  metadata: CandidateMetadataOverride
}

export interface ChannelProfile {
  /** Shared display name, used as fallback for both platforms. */
  name: string
  avatarAssetId: string | null
  youtube: {
    channelName: string
    views: number
    danmaku: number
    durationSec: number
    publishedHoursAgo: number
  }
  bilibili: {
    uploaderName: string
    views: number
    danmaku: number
    durationSec: number
    publishedHoursAgo: number
  }
  /** fixed = always use the numbers above; random = jitter them per feed. */
  metadataMode: MetadataMode
}

export interface TestSettings {
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
  /** 1-based slot index used when positionMode === 'fixed'. */
  fixedPosition: number
  useFixedSeed: boolean
  seed: string
  /** 干扰视频使用每日抓取的真实封面池(按平台),而不是内置程序生成视频。 */
  useRealPool: boolean
  /** 竞争环境: 全站 / Minecraft / 我的竞品库 */
  competitionEnvironment: CompetitionEnvironment
  /** 锁定竞争环境: 同一轮测试的所有方案面对同一组干扰视频, 降低环境噪声 */
  lockCompetitionEnvironment: boolean
  blindDuration: BlindDuration
  rounds: number
  candidateScope: 'all' | 'single'
  singleCandidateId: string | null
}

export interface MockVideo {
  id: string
  title: string
  channel: string
  views: number
  danmaku?: number
  durationSec: number
  publishedHoursAgo: number
  /** Set when the user uploaded a real cover image. */
  thumbAssetId?: string
  /** Direct image URL (每日真实封面池的封面热链平台 CDN). */
  thumbSrcUrl?: string
  /** 所属平台; 缺省表示不限平台(竞品库中始终可用) */
  platform?: Platform
  /** 竞品库内的展示顺序 */
  order?: number
  custom: boolean
  enabled: boolean
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnails: ThumbnailItem[]
  titles: TitleItem[]
  candidates: Candidate[]
  channel: ChannelProfile
  testSettings: TestSettings
  /** User-imported distractor videos. */
  mockVideos: MockVideo[]
  /** Builtin distractor videos excluded from tests. */
  disabledBuiltinMockIds: string[]
}

// --- Feed ------------------------------------------------------------------

export interface FeedVideo {
  id: string
  kind: 'candidate' | 'mock'
  candidateId?: string
  title: string
  channel: string
  thumbAssetId?: string
  /** Inline (generated) thumbnail source, used when there is no asset. */
  thumbSrc?: string
  thumbCrop?: Record<PlatformEnv, CropState>
  sourceWidth?: number
  sourceHeight?: number
  avatarAssetId?: string
  avatarName: string
  views: number
  danmaku?: number
  durationSec: number
  publishedHoursAgo: number
}

export interface GeneratedFeed {
  items: FeedVideo[]
  /** Index of the candidate inside items, or -1 when no candidate. */
  candidateIndex: number
  seed: string
}

// --- Sessions --------------------------------------------------------------

/**
 * 实验环境快照: TestSession 创建时写入, 之后不可变。
 * 用于让历史结果忠实反映"当时真正发生了什么", 而不是当前项目设置。
 */
export interface ExperimentSnapshot {
  competitionEnvironment: CompetitionEnvironment
  lockCompetitionEnvironment: boolean
  useFixedSeed: boolean
  randomizeFeedOrder: boolean
  randomizeMetadata: boolean
  mockCount: number
  useRealPool?: boolean
  /** 锁定竞争环境时, 本次运行共用的环境种子 */
  environmentSeed?: string
  /** 实验开始时配置的基础 Seed (useFixedSeed=true 时等于 runSeed) */
  baseSeed?: string
  /** 一次完整测试运行的种子 */
  runSeed?: string
}

export interface ViewportSize {
  width: number
  height: number
}

export interface TestSession {
  id: string
  projectId: string
  startedAt: number
  finishedAt: number
  platform: Platform
  device: Device
  viewport: ViewportSize
  mode: TestMode
  candidateId: string
  thumbnailId: string | null
  titleId: string | null
  /** 1-based slot of the candidate inside the feed. */
  candidatePosition: number
  seed: string
  clickedVideoId: string | null
  targetClicked: boolean
  /** ms from question/target-hunt start to the decisive click. */
  reactionTime: number | null
  wrongClicks: number
  /** Configured exposure seconds (0 = unlimited). */
  exposureDuration: number
  /** 实验环境快照; 旧版本记录没有此字段, 展示时按 unknown 处理。 */
  experimentSnapshot?: ExperimentSnapshot
}

// --- Assets ----------------------------------------------------------------

export type AssetKind = 'thumbnail' | 'avatar' | 'mock-thumb'

export interface StoredAsset {
  id: string
  projectId: string
  kind: AssetKind
  mime: string
  name: string
  width: number
  height: number
  size: number
  createdAt: number
  blob: Blob
}


// ---------------------------------------------------------------------------
// 旧数据兼容: 补齐新增字段, 不破坏已有 IndexedDB / project.json 数据
// ---------------------------------------------------------------------------

/** 补齐 TestSettings 新增字段; 旧 distractorCategory 迁移为 competitionEnvironment。 */
export function normalizeTestSettings(s: TestSettings): TestSettings {
  const legacy = (s as { distractorCategory?: 'normal' | 'minecraft' }).distractorCategory
  const env = (s as { competitionEnvironment?: CompetitionEnvironment }).competitionEnvironment
  return {
    ...s,
    competitionEnvironment: env ?? (legacy === 'minecraft' ? 'minecraft' : 'site'),
    lockCompetitionEnvironment: (s as { lockCompetitionEnvironment?: boolean }).lockCompetitionEnvironment ?? false,
  }
}

/** 读取存储中的项目时补齐新字段, 保证旧数据可打开。 */
export function normalizeProject(p: Project): Project {
  return { ...p, testSettings: normalizeTestSettings(p.testSettings) }
}

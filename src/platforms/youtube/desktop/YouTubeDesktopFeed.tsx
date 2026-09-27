import { Menu, Mic, Bell, Video, MoreVertical, Search, Home, Zap, Layers } from 'lucide-react'
import type { FeedProps } from '../../types'
import { YOUTUBE_DESKTOP_PRESET as P, YT_THEMES } from '../presets'
import { ThumbImage, FeedAvatar, InspectProbe } from '../../../components/feed/primitives'
import { formatCount, formatDuration, formatPublishTime } from '../../../lib/format'
import type { FeedVideo } from '../../../types'

function YouTubeLogo({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="30" height="21" viewBox="0 0 30 21">
        <rect width="30" height="21" rx="5.5" fill="#FF0000" />
        <path d="M12 5.5 L20 10.5 L12 15.5 Z" fill="#ffffff" />
      </svg>
      <span className="text-[19px] font-semibold tracking-tighter" style={{ color }}>
        YouTube
      </span>
    </div>
  )
}

function HeaderIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: '#606060' }}>
      {children}
    </div>
  )
}

function YouTubeVideoCard({ video, t, clickable, onSelect }: { video: FeedVideo; t: (typeof YT_THEMES)['light']; clickable: boolean; onSelect?: (v: FeedVideo) => void }) {
  const card = (
    <>
      <div className="relative overflow-hidden" data-inspect="thumb" style={{ borderRadius: P.thumbnailRadius, aspectRatio: '16 / 9', background: '#1a1a1a' }}>
        <ThumbImage video={video} env="youtube-desktop" className="h-full w-full object-cover" />
        <span
          className="absolute bottom-1.5 right-1.5 rounded font-medium"
          style={{ background: t.badgeBg, color: t.badgeText, fontSize: P.durationFontSize, padding: '1px 4px', lineHeight: '16px' }}
        >
          {formatDuration(video.durationSec)}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        <FeedAvatar name={video.avatarName} assetId={video.avatarAssetId} size={P.avatarSize} />
        <div className="min-w-0 flex-1">
          <div
            data-inspect="title"
            className="line-clamp-2"
            style={{ fontSize: P.titleFontSize, lineHeight: `${P.titleLineHeight}px`, fontWeight: P.titleWeight, color: t.textPrimary }}
          >
            {video.title}
          </div>
          <div className="mt-1 truncate" style={{ fontSize: P.metaFontSize, lineHeight: `${P.metaLineHeight}px`, color: t.textSecondary }}>
            {video.channel}
          </div>
          <div style={{ fontSize: P.metaFontSize, lineHeight: `${P.metaLineHeight}px`, color: t.textSecondary }}>
            {formatCount(video.views)}次观看 · {formatPublishTime(video.publishedHoursAgo)}
          </div>
        </div>
        <div className="shrink-0 pt-0.5 opacity-0 transition-opacity group-hover:opacity-70">
          <MoreVertical size={18} color={t.textSecondary} />
        </div>
      </div>
    </>
  )

  const inner = (
    <div
      className={clickable ? 'group cursor-pointer' : 'group'}
      onClick={clickable ? () => onSelect?.(video) : undefined}
      style={{ borderRadius: 4 }}
    >
      {card}
    </div>
  )

  return video.candidateId ? (
    <InspectProbe video={video} className="relative">
      {inner}
    </InspectProbe>
  ) : (
    inner
  )
}

function SidebarRow({ icon, label, active, t }: { icon?: React.ReactNode; label: string; active?: boolean; t: (typeof YT_THEMES)['light'] }) {
  return (
    <div
      className="flex items-center gap-6 rounded-lg px-3 py-2 text-sm"
      style={{
        background: active ? t.hoverBg : undefined,
        color: t.textPrimary,
        fontWeight: active ? 500 : 400,
        fontSize: 14,
      }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}

function MiniRailRow({ icon, label, active, t }: { icon: React.ReactNode; label: string; active?: boolean; t: (typeof YT_THEMES)['light'] }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg py-4" style={{ background: active ? t.hoverBg : undefined, color: t.textPrimary }}>
      {icon}
      <span style={{ fontSize: 10 }}>{label}</span>
    </div>
  )
}

export function YouTubeDesktopFeed({ feed, theme, frameWidth, onSelectVideo }: FeedProps) {
  const t = YT_THEMES[theme]
  const expanded = frameWidth >= P.sidebarAutoExpandMin
  const sidebarW = expanded ? P.sidebarWidth : P.miniSidebarWidth
  const clickable = !!onSelectVideo

  return (
    <div className="relative h-full w-full" style={{ background: t.pageBg, color: t.textPrimary, fontFamily: P.font }}>
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center px-4" style={{ height: P.headerHeight, background: t.headerBg }}>
        <div className="flex items-center gap-3" style={{ width: sidebarW - 8 }}>
          <Menu size={22} />
          <YouTubeLogo color={t.textPrimary} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full items-center" style={{ maxWidth: P.searchMaxWidth }}>
            <div
              className="flex h-10 flex-1 items-center rounded-l-full border px-4"
              style={{ borderColor: t.searchBorder, background: t.searchBg }}
            >
              <Search size={16} color={t.textSecondary} />
              <span className="ml-3 text-sm" style={{ color: t.textSecondary }}>
                搜索
              </span>
            </div>
            <button className="flex h-10 w-16 items-center justify-center rounded-r-full border border-l-0" style={{ borderColor: t.searchBorder, background: t.surface }}>
              <Search size={18} color={t.textSecondary} />
            </button>
            <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: t.surface }}>
              <Mic size={18} color={t.textPrimary} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HeaderIcon>
            <Video size={20} />
          </HeaderIcon>
          <HeaderIcon>
            <Bell size={20} />
          </HeaderIcon>
          <div className="ml-1 h-8 w-8 rounded-full" style={{ background: 'linear-gradient(135deg, #7c6cf0, #3fb0e8)' }} />
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className="absolute bottom-0 left-0 z-20 overflow-y-auto"
        style={{ top: P.headerHeight, width: sidebarW, background: t.sidebarBg, padding: expanded ? '8px' : '4px' }}
      >
        {expanded ? (
          <>
            <SidebarRow icon={<Home size={20} />} label="首页" active t={t} />
            <SidebarRow icon={<Zap size={20} />} label="Shorts" t={t} />
            <SidebarRow icon={<Layers size={20} />} label="订阅内容" t={t} />
            <div className="mx-3 my-3 border-t" style={{ borderColor: t.border }} />
            <div className="px-3 py-1 text-base font-medium" style={{ color: t.textPrimary }}>
              你
            </div>
            <SidebarRow label="历史记录" t={t} />
            <SidebarRow label="播放列表" t={t} />
            <SidebarRow label="你的视频" t={t} />
            <SidebarRow label="稍后观看" t={t} />
            <SidebarRow label="已赞的视频" t={t} />
            <div className="mx-3 my-3 border-t" style={{ borderColor: t.border }} />
            <div className="px-3 py-1 text-base font-medium" style={{ color: t.textPrimary }}>
              订阅频道
            </div>
            {['方块生存笔记', '极客车间', '厨房炼金术', '游戏显微镜', '人间观察所'].map((name) => (
              <div key={name} className="flex items-center gap-6 px-3 py-1.5">
                <FeedAvatar name={name} size={24} />
                <span className="truncate text-sm" style={{ color: t.textPrimary }}>
                  {name}
                </span>
              </div>
            ))}
            <div className="mx-3 my-3 border-t" style={{ borderColor: t.border }} />
            <div className="px-3 py-1 text-base font-medium" style={{ color: t.textPrimary }}>
              探索
            </div>
            <SidebarRow label="音乐" t={t} />
            <SidebarRow label="游戏" t={t} />
            <SidebarRow label="新闻" t={t} />
            <SidebarRow label="直播" t={t} />
          </>
        ) : (
          <>
            <MiniRailRow icon={<Home size={22} />} label="首页" active t={t} />
            <MiniRailRow icon={<Zap size={22} />} label="Shorts" t={t} />
            <MiniRailRow icon={<Layers size={22} />} label="订阅" t={t} />
          </>
        )}
      </aside>

      {/* Content */}
      <main className="absolute bottom-0 overflow-y-auto" style={{ top: P.headerHeight, left: sidebarW, right: 0 }}>
        <div className="sticky top-0 z-10 flex gap-3 overflow-hidden" style={{ background: t.pageBg, padding: `8px ${P.contentPaddingX}px` }}>
          {P.chips.map((chip, i) => (
            <span
              key={chip}
              className="shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-medium"
              style={{
                background: i === 0 ? t.chipActiveBg : t.chipBg,
                color: i === 0 ? t.chipActiveText : t.textPrimary,
                lineHeight: '32px',
              }}
            >
              {chip}
            </span>
          ))}
        </div>
        <div
          className="grid"
          style={{
            padding: `8px ${P.contentPaddingX}px 32px`,
            gridTemplateColumns: `repeat(${P.columns}, minmax(0, 1fr))`,
            columnGap: P.gridGapX,
            rowGap: P.gridGapY,
          }}
        >
          {feed.map((v) => (
            <YouTubeVideoCard key={v.id} video={v} t={t} clickable={clickable} onSelect={onSelectVideo} />
          ))}
        </div>
      </main>
    </div>
  )
}

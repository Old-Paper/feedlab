import { Bell, Cast, Home, Layers, MoreVertical, Plus, Search, User, Zap } from 'lucide-react'
import type { FeedProps } from '../../types'
import { YT_THEMES, YOUTUBE_MOBILE_PRESETS, type YouTubeMobilePreset } from '../presets'
import { ThumbImage, FeedAvatar, InspectProbe } from '../../../components/feed/primitives'
import { formatCount, formatDuration, formatPublishTime } from '../../../lib/format'
import type { FeedVideo } from '../../../types'

function YouTubeLogoCompact({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1">
      <svg width="26" height="18" viewBox="0 0 30 21">
        <rect width="30" height="21" rx="5.5" fill="#FF0000" />
        <path d="M12 5.5 L20 10.5 L12 15.5 Z" fill="#ffffff" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tighter" style={{ color }}>
        YouTube
      </span>
    </div>
  )
}

function MobileCard({ video, p, t, clickable, onSelect }: { video: FeedVideo; p: YouTubeMobilePreset; t: (typeof YT_THEMES)['light']; clickable: boolean; onSelect?: (v: FeedVideo) => void }) {
  const inner = (
    <div className={clickable ? 'cursor-pointer pb-4' : 'pb-4'} onClick={clickable ? () => onSelect?.(video) : undefined}>
      <div className="relative overflow-hidden" data-inspect="thumb" style={{ borderRadius: p.thumbnailRadius, aspectRatio: '16 / 9', background: '#1a1a1a' }}>
        <ThumbImage video={video} env="youtube-mobile" className="h-full w-full object-cover" />
        <span
          className="absolute bottom-1.5 right-1.5 rounded font-medium"
          style={{ background: t.badgeBg, color: t.badgeText, fontSize: p.durationFontSize, padding: '1px 4px', lineHeight: '15px' }}
        >
          {formatDuration(video.durationSec)}
        </span>
      </div>
      {/* m.youtube.com 实测结构: 头像与标题同行, 频道行与 播放量·时间行 均与标题左缘对齐 */}
      <div className="flex gap-3" style={{ padding: `10px ${p.paddingX}px 0` }}>
        <FeedAvatar name={video.avatarName} assetId={video.avatarAssetId} size={p.avatarSize} />
        <div className="min-w-0 flex-1">
          <div
            data-inspect="title"
            className="line-clamp-2"
            style={{ fontSize: p.titleFontSize, lineHeight: `${p.titleLineHeight}px`, fontWeight: p.titleWeight, color: t.textPrimary }}
          >
            {video.title}
          </div>
          <div className="truncate" style={{ marginTop: 2, fontSize: p.metaFontSize, lineHeight: `${p.metaLineHeight}px`, color: t.textSecondary }}>
            {video.channel}
          </div>
          <div style={{ fontSize: p.metaFontSize, lineHeight: `${p.metaLineHeight}px`, color: t.textSecondary }}>
            {formatCount(video.views)}次观看 · {formatPublishTime(video.publishedHoursAgo)}
          </div>
        </div>
        <div className="shrink-0">
          <MoreVertical size={18} color={t.textSecondary} />
        </div>
      </div>
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

const CHIPS = ['全部', '音乐', '游戏', '直播', '编程', '动画', '新闻', '播客', '实况', '最新上传']

export function YouTubeMobileFeed({ feed, theme, onSelectVideo, ytMobileStyle = 'standard' }: FeedProps) {
  const p = YOUTUBE_MOBILE_PRESETS[ytMobileStyle]
  const t = YT_THEMES[theme]
  const clickable = !!onSelectVideo

  return (
    <div className="relative h-full w-full" style={{ background: t.pageBg, fontFamily: p.font }}>
      <div className="absolute inset-0 overflow-y-auto" style={{ paddingBottom: p.bottomNavHeight }}>
        {/* Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between"
          style={{ height: p.headerHeight, background: t.headerBg, padding: '0 14px' }}
        >
          <YouTubeLogoCompact color={t.textPrimary} />
          <div className="flex items-center gap-5">
            <Cast size={21} color={t.textPrimary} />
            <Bell size={21} color={t.textPrimary} />
            <Search size={21} color={t.textPrimary} />
            <div className="h-7 w-7 rounded-full" style={{ background: 'linear-gradient(135deg, #7c6cf0, #3fb0e8)' }} />
          </div>
        </header>

        {/* Chips */}
        {p.showChips ? (
          <div className="sticky z-20 flex gap-2 overflow-hidden" style={{ top: p.headerHeight, background: t.headerBg, padding: '6px 12px 8px' }}>
            {CHIPS.map((chip, i) => (
              <span
                key={chip}
                className="shrink-0 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium"
                style={{
                  background: i === 0 ? t.chipActiveBg : t.chipBg,
                  color: i === 0 ? t.chipActiveText : t.textPrimary,
                  lineHeight: '30px',
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {/* Vertical feed */}
        <div className="pt-1">
          {feed.map((v) => (
            <MobileCard key={v.id} video={v} p={p} t={t} clickable={clickable} onSelect={onSelectVideo} />
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <nav
        className="absolute inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t"
        style={{ height: p.bottomNavHeight, background: t.navBg, borderColor: t.border }}
      >
        {[
          { icon: <Home size={22} />, label: '首页', active: true },
          { icon: <Zap size={22} />, label: 'Shorts' },
          { icon: <Plus size={24} />, label: '' },
          { icon: <Layers size={22} />, label: '订阅内容' },
          { icon: <User size={22} />, label: '你' },
        ].map((item, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-center gap-0.5">
            <div style={{ color: item.active ? t.textPrimary : t.navInactive }}>{item.icon}</div>
            {p.bottomNavLabels && item.label ? (
              <span style={{ fontSize: 10, color: item.active ? t.textPrimary : t.navInactive }}>{item.label}</span>
            ) : null}
          </div>
        ))}
      </nav>
    </div>
  )
}

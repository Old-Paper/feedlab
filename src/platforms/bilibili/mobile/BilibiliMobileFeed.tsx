import { Home, User, Zap, Compass, Plus } from 'lucide-react'
import type { FeedProps } from '../../types'
import { BILIBILI_MOBILE_PRESET as P, BILI_THEMES } from '../presets'
import { ThumbImage, InspectProbe } from '../../../components/feed/primitives'
import { formatCount, formatDuration, formatPublishTime } from '../../../lib/format'
import type { FeedVideo } from '../../../types'

// 卡片结构按 m.bilibili.com 线上实测 (2026-09, 390×844):
// 封面圆角 6 / 图内底部渐变条(播放·弹幕 13px/18px 白, padding 16px 8px 6px, 时长右下) /
// 标题 15px/22px weight 400 #18191c clamp 2 padding-right 30 / UP 行 13px/17px #9499a0 margin-top 4。
// 双列网格 + 底部导航为 APP 布局需求。

function BilibiliMobileCard({ video, t, clickable, onSelect }: { video: FeedVideo; t: (typeof BILI_THEMES)['light']; clickable: boolean; onSelect?: (v: FeedVideo) => void }) {
  const inner = (
    <div onClick={clickable ? () => onSelect?.(video) : undefined} style={{ cursor: clickable ? 'pointer' : undefined }}>
      <div className="relative overflow-hidden" data-inspect="thumb" style={{ borderRadius: P.thumbnailRadius, aspectRatio: '16 / 9', background: '#d8dadc' }}>
        <ThumbImage video={video} env="bilibili-mobile" className="h-full w-full object-cover" />
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-between"
          style={{
            padding: '16px 6px 4px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
            fontSize: P.statsFontSize,
            lineHeight: `${P.statsLineHeight}px`,
            color: t.badgeText,
          }}
        >
          <span className="flex items-center gap-0.5" style={{ marginRight: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 2.5v19l16-9.5z" />
            </svg>
            {formatCount(video.views)}
          </span>
          <span>{formatDuration(video.durationSec)}</span>
        </div>
      </div>
      <div style={{ marginTop: P.infoMarginTop }}>
        <div
          data-inspect="title"
          className="line-clamp-2"
          style={{
            fontSize: P.titleFontSize,
            lineHeight: `${P.titleLineHeight}px`,
            fontWeight: P.titleWeight,
            color: t.textPrimary,
            paddingRight: P.titlePaddingRight,
          }}
        >
          {video.title}
        </div>
        <div
          className="flex items-center justify-between"
          style={{ marginTop: P.metaMarginTop, fontSize: P.metaFontSize, lineHeight: `${P.metaLineHeight}px`, color: t.textSecondary }}
        >
          <span className="truncate">{video.channel}</span>
          <span className="shrink-0 pl-1">{formatPublishTime(video.publishedHoursAgo)}</span>
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

export function BilibiliMobileFeed({ feed, theme, onSelectVideo }: FeedProps) {
  const t = BILI_THEMES[theme]
  const clickable = !!onSelectVideo

  return (
    <div className="relative h-full w-full" style={{ background: t.pageBg, fontFamily: P.font, color: t.textPrimary }}>
      <div className="absolute inset-0 overflow-y-auto" style={{ paddingBottom: P.bottomNavHeight }}>
        {/* 顶部导航: logo + 横向频道链接 (m.bilibili.com 结构) */}
        <header className="sticky top-0 z-30 border-b" style={{ background: t.headerBg, borderColor: t.border }}>
          <div className="flex items-center gap-3" style={{ height: P.navRowHeight, padding: '0 10px' }}>
            <svg width="24" height="21" viewBox="0 0 34 30" className="shrink-0">
              <path d="M8 3 L13 8 M26 3 L21 8" stroke={t.accent} strokeWidth="2.8" strokeLinecap="round" fill="none" />
              <rect x="3" y="8" width="28" height="19" rx="5" fill="none" stroke={t.textPrimary} strokeWidth="2.6" />
              <rect x="9.5" y="13.5" width="4" height="5.5" rx="1.8" fill={t.textPrimary} />
              <rect x="20.5" y="13.5" width="4" height="5.5" rx="1.8" fill={t.textPrimary} />
            </svg>
            <nav className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
              {P.navLinks.map((link, i) => (
                <span
                  key={link}
                  className="shrink-0 whitespace-nowrap"
                  style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? t.accent : t.textPrimary }}
                >
                  {link}
                </span>
              ))}
              <span className="shrink-0" style={{ fontSize: 14, color: t.textSecondary }}>
                ›
              </span>
            </nav>
          </div>
        </header>

        {/* 双列网格 (APP 紧凑间距) */}
        <div
          className="grid"
          style={{
            padding: `10px ${P.contentPaddingX}px 20px`,
            gridTemplateColumns: `repeat(${P.gridColumns}, minmax(0, 1fr))`,
            columnGap: P.gridGapX,
            rowGap: P.gridGapY,
          }}
        >
          {feed.map((v) => (
            <BilibiliMobileCard key={v.id} video={v} t={t} clickable={clickable} onSelect={onSelectVideo} />
          ))}
        </div>
      </div>

      {/* 底部导航 */}
      <nav
        className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-around border-t"
        style={{ height: P.bottomNavHeight, background: t.navBg, borderColor: t.border }}
      >
        <div className="flex flex-1 flex-col items-center gap-0.5" style={{ color: t.accent }}>
          <Home size={21} />
          <span style={{ fontSize: 10 }}>首页</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5" style={{ color: t.navInactive }}>
          <Compass size={21} />
          <span style={{ fontSize: 10 }}>频道</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex h-8 w-12 items-center justify-center rounded-md" style={{ background: t.accent, color: '#ffffff' }}>
            <Plus size={19} />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5" style={{ color: t.navInactive }}>
          <Zap size={21} />
          <span style={{ fontSize: 10 }}>动态</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5" style={{ color: t.navInactive }}>
          <User size={21} />
          <span style={{ fontSize: 10 }}>我的</span>
        </div>
      </nav>
    </div>
  )
}

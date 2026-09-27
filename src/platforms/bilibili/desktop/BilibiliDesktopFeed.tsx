import { Search, Plus } from 'lucide-react'
import type { FeedProps } from '../../types'
import { BILIBILI_DESKTOP_PRESET as P, BILI_THEMES } from '../presets'
import { ThumbImage, FeedAvatar, InspectProbe } from '../../../components/feed/primitives'
import { formatCount, formatDuration, formatPublishTime } from '../../../lib/format'
import type { FeedVideo } from '../../../types'

// 结构与尺寸均按 bilibili.com 线上实测 (2026-09, 1920×1080):
// header 64px;分类 pill 32px 圆角 6 bg #f6f7f8 字 14 #61666d;
// 网格固定 309px 列 gap 20 居中;封面圆角 6;播放/弹幕/时长位于封面底部渐变条内;
// 标题 15px/22 weight 400 clamp 2 padding-right 30;UP 行 13px/17 #9499a0 margin-top 4。

function BiliLogo({ t }: { t: (typeof BILI_THEMES)['light'] }) {
  return (
    <div className="flex items-center gap-1">
      <svg width="30" height="26" viewBox="0 0 34 30">
        <path d="M8 3 L13 8 M26 3 L21 8" stroke={t.accent} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <rect x="3" y="8" width="28" height="19" rx="5" fill="none" stroke={t.textPrimary} strokeWidth="2.6" />
        <rect x="9.5" y="13.5" width="4" height="5.5" rx="1.8" fill={t.textPrimary} />
        <rect x="20.5" y="13.5" width="4" height="5.5" rx="1.8" fill={t.textPrimary} />
      </svg>
      <span className="text-[20px] font-bold" style={{ color: t.textPrimary, letterSpacing: '-0.5px' }}>
        bilibili
      </span>
    </div>
  )
}

/** 封面底部渐变信息条: 播放/弹幕靠左, 时长靠右 (实测 padding 16px 8px 6px, 13px/18px 白) */
function CoverStats({ video, t }: { video: FeedVideo; t: (typeof BILI_THEMES)['light'] }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-end justify-between"
      style={{
        padding: '16px 8px 6px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
        fontSize: P.statsFontSize,
        lineHeight: `${P.statsLineHeight}px`,
        color: t.badgeText,
      }}
    >
      <div className="flex items-center">
        <span className="flex items-center gap-0.5" style={{ marginRight: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 2.5v19l16-9.5z" />
          </svg>
          {formatCount(video.views)}
        </span>
        {video.danmaku !== undefined ? (
          <span className="flex items-center gap-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5z" />
            </svg>
            {formatCount(video.danmaku)}
          </span>
        ) : null}
      </div>
      <span>{formatDuration(video.durationSec)}</span>
    </div>
  )
}

function BilibiliVideoCard({ video, t, clickable, onSelect }: { video: FeedVideo; t: (typeof BILI_THEMES)['light']; clickable: boolean; onSelect?: (v: FeedVideo) => void }) {
  const inner = (
    <div className="group" onClick={clickable ? () => onSelect?.(video) : undefined} style={{ cursor: clickable ? 'pointer' : undefined }}>
      <div className="relative overflow-hidden" data-inspect="thumb" style={{ borderRadius: P.thumbnailRadius, aspectRatio: '16 / 9', background: '#d8dadc' }}>
        <ThumbImage video={video} env="bilibili-desktop" className="h-full w-full object-cover" />
        <CoverStats video={video} t={t} />
      </div>
      <div style={{ marginTop: P.infoMarginTop }}>
        <div className="relative">
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
          <span className="absolute right-1 top-0 opacity-0 transition-opacity group-hover:opacity-60">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={t.textSecondary}>
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </span>
        </div>
        <div
          className="flex items-center justify-between"
          style={{ marginTop: P.metaMarginTop, fontSize: P.metaFontSize, lineHeight: `${P.metaLineHeight}px`, color: t.textSecondary }}
        >
          <span className="truncate">{video.channel}</span>
          <span className="shrink-0 pl-2">{formatPublishTime(video.publishedHoursAgo)}</span>
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

export function BilibiliDesktopFeed({ feed, theme, onSelectVideo }: FeedProps) {
  const t = BILI_THEMES[theme]
  const clickable = !!onSelectVideo

  return (
    <div className="relative h-full w-full" style={{ background: t.pageBg, fontFamily: P.font, color: t.textPrimary }}>
      {/* Header 64px */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-5 border-b px-6" style={{ height: P.headerHeight, background: t.headerBg, borderColor: t.border }}>
        <BiliLogo t={t} />
        <nav className="hidden items-center gap-5 lg:flex">
          {P.navLinks.map((link, i) => (
            <span
              key={link}
              className="whitespace-nowrap"
              style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? t.accent : t.textPrimary }}
            >
              {link}
            </span>
          ))}
        </nav>
        <div className="flex flex-1 justify-center">
          <div className="flex w-full items-center" style={{ maxWidth: P.searchMaxWidth }}>
            <div className="flex h-9 flex-1 items-center rounded-l-lg border px-3" style={{ borderColor: t.searchBorder, background: t.searchBg }}>
              <span style={{ fontSize: 13, color: t.textSecondary }}>搜索视频、番剧、UP主</span>
            </div>
            <button className="flex h-9 w-14 items-center justify-center rounded-r-lg" style={{ background: t.accent }}>
              <Search size={16} color="#ffffff" />
            </button>
          </div>
        </div>
        <div className="hidden items-center gap-4 xl:flex" style={{ fontSize: 13, color: t.textSecondary }}>
          {P.rightEntryLinks.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <FeedAvatar name="我" size={34} />
        <button className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-[13px] font-medium" style={{ background: t.accent, color: t.accentText }}>
          <Plus size={15} />
          投稿
        </button>
      </header>

      {/* 分类入口区: 左侧动态/热门图标 + 两行 pill + 右侧链接 */}
      <div
        className="absolute inset-x-0 z-20 flex items-start gap-6 border-b px-6 py-3"
        style={{ top: P.headerHeight, background: t.headerBg, borderColor: t.border }}
      >
        <div className="hidden shrink-0 gap-4 md:flex">
          {[
            { label: '动态', color: '#f691a4', icon: 'M12 21s-7-4.6-9.5-9C.9 8.6 2.7 5 6 5c2 0 3.2 1 4 2.2h4C14.8 6 16 5 18 5c3.3 0 5.1 3.6 3.5 7-2.5 4.4-9.5 9-9.5 9z' },
            { label: '热门', color: '#f25d5d', icon: 'M12 2c1 4-4 6-4 11a4 4 0 0 0 8 0c0-1.5-.5-2.5-.5-2.5S18 12 18 15a6 6 0 0 1-12 0c0-6 5-8 6-13z' },
          ].map((e) => (
            <div key={e.label} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: e.color }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                  <path d={e.icon} />
                </svg>
              </div>
              <span style={{ fontSize: 12, color: t.textPrimary }}>{e.label}</span>
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          {([P.chipsRow1, P.chipsRow2] as const).map((row, ri) => (
            <div key={ri} className="grid overflow-hidden" style={{ gridAutoFlow: 'column', gap: P.pillGap, justifyContent: 'start', marginBottom: ri === 0 ? P.pillGap : 0 }}>
              {row.map((chip) => (
                <span
                  key={chip}
                  className="shrink-0 cursor-pointer text-center"
                  style={{
                    height: P.pillHeight,
                    lineHeight: `${P.pillHeight}px`,
                    borderRadius: 6,
                    background: t.chipBg,
                    color: t.navInactive,
                    fontSize: 14,
                    padding: '0 14px',
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="hidden shrink-0 flex-col gap-2 xl:flex" style={{ fontSize: 13, color: t.textSecondary }}>
          {P.sideLinks.map((l) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: t.accent }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* 推荐网格: 实测固定 309px 列 + gap 20 居中 */}
      <main className="absolute inset-x-0 bottom-0 overflow-y-auto" style={{ top: P.headerHeight + 96 }}>
        <div
          className="grid"
          style={{
            paddingTop: 14,
            paddingBottom: 32,
            gridTemplateColumns: `repeat(auto-fill, ${P.cardWidth}px)`,
            justifyContent: 'center',
            columnGap: P.gridGapX,
            rowGap: P.gridGapY,
          }}
        >
          {feed.map((v) => (
            <BilibiliVideoCard key={v.id} video={v} t={t} clickable={clickable} onSelect={onSelectVideo} />
          ))}
        </div>
      </main>
    </div>
  )
}

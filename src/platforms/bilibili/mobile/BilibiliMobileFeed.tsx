import { Home, User, Zap, Plus, Search, Mail, Gamepad2 } from 'lucide-react'
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
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex items-center gap-0.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 2.5v19l16-9.5z" />
              </svg>
              {formatCount(video.views)}
            </span>
            {video.danmaku !== undefined ? (
              <span className="flex items-center gap-0.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
                </svg>
                {formatCount(video.danmaku)}
              </span>
            ) : null}
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
        {/* APP 首页是头像/搜索顶栏 + 频道标签栏两层结构。 */}
        <header className="sticky top-0 z-30 border-b" style={{ background: t.headerBg, borderColor: t.border }}>
          <div className="flex items-center gap-2" style={{ height: P.topBarHeight, padding: '0 10px' }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#fb7299,#ff9db8)' }}>
              我
            </div>
            <div
              className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full px-3"
              style={{ background: t.searchBg, color: t.textSecondary }}
            >
              <Search size={15} />
              <span className="truncate text-[13px]">大家都在搜：热门视频</span>
            </div>
            <Gamepad2 size={20} color={t.accent} />
            <Mail size={20} color={t.textSecondary} />
          </div>
          <nav className="flex items-center gap-5 overflow-hidden px-3" style={{ height: P.tabsHeight }}>
              {P.navLinks.map((link) => {
                const active = link === '推荐'
                return (
                <span
                  key={link}
                  className="relative flex h-full shrink-0 items-center whitespace-nowrap"
                  style={{ fontSize: 15, fontWeight: active ? 600 : 400, color: active ? t.accent : t.textPrimary }}
                >
                  {link}
                  {active ? <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full" style={{ background: t.accent }} /> : null}
                </span>
                )
              })}
          </nav>
        </header>

        {/* 双列网格 (APP 紧凑间距) */}
        <div
          className="grid"
          style={{
            padding: `8px ${P.contentPaddingX}px 24px`,
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
          <Zap size={21} />
          <span style={{ fontSize: 10 }}>动态</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex h-8 w-12 items-center justify-center rounded-md" style={{ background: t.accent, color: '#ffffff' }}>
            <Plus size={19} />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5" style={{ color: t.navInactive }}>
          <span className="text-lg leading-none">◆</span>
          <span style={{ fontSize: 10 }}>会员购</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5" style={{ color: t.navInactive }}>
          <User size={21} />
          <span style={{ fontSize: 10 }}>我的</span>
        </div>
      </nav>
    </div>
  )
}

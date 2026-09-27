import type { Platform, Device } from '../types'
import type { FeedProps } from './types'
import { YouTubeDesktopFeed } from './youtube/desktop/YouTubeDesktopFeed'
import { YouTubeMobileFeed } from './youtube/mobile/YouTubeMobileFeed'
import { BilibiliDesktopFeed } from './bilibili/desktop/BilibiliDesktopFeed'
import { BilibiliMobileFeed } from './bilibili/mobile/BilibiliMobileFeed'

/**
 * Single entry point: picks the correct independent layout for the
 * platform × device pair. Mobile layouts are NOT scaled desktops — each of
 * the four environments has its own feed implementation.
 */
export function FeedRenderer({ platform, device, ...rest }: FeedProps & { platform: Platform; device: Device }) {
  if (platform === 'youtube') {
    return device === 'desktop' ? (
      <YouTubeDesktopFeed {...rest} />
    ) : (
      <YouTubeMobileFeed {...rest} />
    )
  }
  return device === 'desktop' ? (
    <BilibiliDesktopFeed {...rest} />
  ) : (
    <BilibiliMobileFeed {...rest} />
  )
}

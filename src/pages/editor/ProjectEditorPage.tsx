import { useState } from 'react'
import { clsx } from 'clsx'
import { useProjectStore } from '../../stores/projectStore'

import { ThumbnailsTab } from './ThumbnailsTab'
import { TitlesTab } from './TitlesTab'
import { CandidatesTab } from './CandidatesTab'
import { ChannelTab } from './ChannelTab'
import { MockVideosTab } from './MockVideosTab'
import { TestSettingsTab } from './TestSettingsTab'

const TABS = [
  { id: 'thumbnails', label: '封面' },
  { id: 'titles', label: '标题' },
  { id: 'candidates', label: 'Candidate 组合' },
  { id: 'channel', label: '频道资料' },
  { id: 'mocks', label: '干扰视频库' },
  { id: 'settings', label: '测试设置' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ProjectEditorPage() {
  const project = useProjectStore((s) => s.project)
  const [tab, setTab] = useState<TabId>('thumbnails')
  if (!project) return null

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-[#1e2027] bg-[#101218] px-5 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold text-zinc-100">{project.name}</h1>
          <div className="text-xs text-zinc-500">
            {project.thumbnails.length} 封面 · {project.titles.length} 标题 · {project.candidates.length} 组合 · 自动保存已开启
          </div>
        </div>
        <nav className="mt-2.5 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                tab === t.id ? 'bg-[#23252d] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-5 py-5">
          {tab === 'thumbnails' && <ThumbnailsTab />}
          {tab === 'titles' && <TitlesTab />}
          {tab === 'candidates' && <CandidatesTab />}
          {tab === 'channel' && <ChannelTab />}
          {tab === 'mocks' && <MockVideosTab />}
          {tab === 'settings' && <TestSettingsTab />}
        </div>
      </div>
    </div>
  )
}

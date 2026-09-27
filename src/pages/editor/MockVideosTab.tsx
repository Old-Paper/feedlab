import { useRef, useState } from 'react'
import { Plus, Trash2, Upload, Database } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { assetRepository } from '../../db/repositories/projectRepository'
import { buildStoredAsset } from '../../lib/image'
import { builtinMockThumb, BUILTIN_MOCK_VIDEOS } from '../../mock/builtinMockVideos'
import { Button, Checkbox, Field, NumberInput, SectionCard, TextInput } from '../../components/ui'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { toast } from '../../stores/toastStore'
import { errorMessage, formatCount, formatDuration, formatPublishTime } from '../../lib/format'
import { uid } from '../../lib/id'
import type { MockVideo } from '../../types'

function MockThumb({ video }: { video: MockVideo }) {
  const url = useAssetUrl(video.thumbAssetId ?? null)
  const src = url ?? builtinMockThumb(video.id, video.title)
  return <img src={src} alt="" className="h-11 w-[78px] shrink-0 rounded object-cover" draggable={false} />
}

function MockRow({ video, onDelete, onToggle }: { video: MockVideo; onDelete?: () => void; onToggle?: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[#23252e] bg-[#14161c] px-2.5 py-2">
      {onToggle ? <Checkbox checked={video.enabled} onChange={onToggle} /> : null}
      <MockThumb video={video} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-zinc-200">{video.title}</div>
        <div className="mt-0.5 text-[11px] text-zinc-500">
          {video.channel} · {formatCount(video.views)}播放 · {video.danmaku ? `${formatCount(video.danmaku)}弹幕 · ` : ''}
          {formatDuration(video.durationSec)} · {formatPublishTime(video.publishedHoursAgo)}
        </div>
      </div>
      {onDelete ? (
        <button className="shrink-0 text-zinc-500 hover:text-red-400" onClick={onDelete} title="删除">
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  )
}

interface DraftMock {
  title: string
  channel: string
  views: number
  danmaku: number
  durationSec: number
  publishedHoursAgo: number
}

const EMPTY_DRAFT: DraftMock = { title: '', channel: '', views: 120000, danmaku: 2400, durationSec: 600, publishedHoursAgo: 48 }

export function MockVideosTab() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  const [draft, setDraft] = useState<DraftMock>(EMPTY_DRAFT)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  if (!project) return null

  const addMock = async () => {
    if (!draft.title.trim()) {
      toast.error('标题不能为空')
      return
    }
    let thumbAssetId: string | undefined
    try {
      if (thumbFile) {
        const asset = await buildStoredAsset(thumbFile, 'mock-thumb', project.id)
        await assetRepository.put(asset)
        thumbAssetId = asset.id
      }
    } catch (e) {
      toast.error(`封面无效:${errorMessage(e)}`)
      return
    }
    update((p) => {
      p.mockVideos.push({
        id: uid(),
        title: draft.title.trim(),
        channel: draft.channel.trim() || '未知UP主',
        views: draft.views,
        danmaku: draft.danmaku > 0 ? draft.danmaku : undefined,
        durationSec: draft.durationSec,
        publishedHoursAgo: draft.publishedHoursAgo,
        thumbAssetId,
        custom: true,
        enabled: true,
      })
    })
    setDraft(EMPTY_DRAFT)
    setThumbFile(null)
    setThumbPreview(null)
    toast.success('已添加干扰视频')
  }

  const pickThumb = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const f = files[0]
    setThumbFile(f)
    setThumbPreview(URL.createObjectURL(f))
  }

  return (
    <div className="space-y-4">
      <SectionCard title="添加自己的干扰视频" hint="用你收集的真实竞品环境做测试">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex aspect-video w-[124px] items-center justify-center overflow-hidden rounded-md border border-[#2f323c] bg-black/40">
              {thumbPreview ? (
                <img src={thumbPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[11px] text-zinc-600">可选封面</span>
              )}
            </div>
            <input ref={thumbInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickThumb(e.target.files)} />
            <Button size="sm" onClick={() => thumbInputRef.current?.click()}>
              <Upload size={13} /> 封面
            </Button>
          </div>
          <div className="flex-1 space-y-2.5">
            <TextInput className="w-full" placeholder="视频标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <TextInput className="w-full" placeholder="频道 / UP 主名" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} />
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <Field label="播放量">
                <NumberInput className="w-full" value={draft.views} onChange={(e) => setDraft({ ...draft, views: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="弹幕">
                <NumberInput className="w-full" value={draft.danmaku} onChange={(e) => setDraft({ ...draft, danmaku: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="时长(秒)">
                <NumberInput className="w-full" value={draft.durationSec} onChange={(e) => setDraft({ ...draft, durationSec: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="几小时前发布">
                <NumberInput className="w-full" value={draft.publishedHoursAgo} onChange={(e) => setDraft({ ...draft, publishedHoursAgo: Number(e.target.value) || 0 })} />
              </Field>
            </div>
            <Button variant="primary" onClick={() => void addMock()}>
              <Plus size={14} /> 添加到项目干扰库
            </Button>
          </div>
        </div>
      </SectionCard>

      {project.mockVideos.length > 0 ? (
        <SectionCard title={`项目自定义干扰视频(${project.mockVideos.length})`}>
          <div className="space-y-1.5">
            {project.mockVideos.map((m) => (
              <MockRow
                key={m.id}
                video={m}
                onToggle={(v) =>
                  update((p) => {
                    const x = p.mockVideos.find((y) => y.id === m.id)
                    if (x) x.enabled = v
                  })
                }
                onDelete={() => {
                  const assetId = m.thumbAssetId
                  update((p) => {
                    p.mockVideos = p.mockVideos.filter((y) => y.id !== m.id)
                  })
                  if (assetId) {
                    setTimeout(() => {
                      const cur = useProjectStore.getState().project
                      if (cur) void assetRepository.deleteOrphan(assetId, cur)
                    }, 500)
                  }
                }}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title={`内置干扰视频库(${BUILTIN_MOCK_VIDEOS.length})`}
        hint="取消勾选 = 不参与该项目的测试。封面对程序生成,不含真实创作者素材。"
      >
        <div className="space-y-1.5">
          {BUILTIN_MOCK_VIDEOS.map((m) => {
            const enabled = !project.disabledBuiltinMockIds.includes(m.id)
            return (
              <MockRow
                key={m.id}
                video={{ ...m, enabled }}
                onToggle={(v) =>
                  update((p) => {
                    if (v) p.disabledBuiltinMockIds = p.disabledBuiltinMockIds.filter((id) => id !== m.id)
                    else if (!p.disabledBuiltinMockIds.includes(m.id)) p.disabledBuiltinMockIds.push(m.id)
                  })
                }
              />
            )
          })}
        </div>
      </SectionCard>

      <div className="flex items-center gap-2 rounded-lg border border-[#23252e] bg-[#12141a] px-4 py-3 text-xs text-zinc-500">
        <Database size={14} />
        测试时会从「启用中的自定义视频 + 未禁用的内置视频」池子里抽取,结合 Seed 打乱顺序。
      </div>
    </div>
  )
}

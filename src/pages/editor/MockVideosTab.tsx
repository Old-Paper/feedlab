import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Database, Pencil, Plus, Trash2, Upload, Layers } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { assetRepository } from '../../db/repositories/projectRepository'
import { buildStoredAsset } from '../../lib/image'
import { builtinMockThumb, BUILTIN_MOCK_VIDEOS } from '../../mock/builtinMockVideos'
import { Button, Checkbox, Field, Modal, NumberInput, SectionCard, Segmented, TextInput, TextArea } from '../../components/ui'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { toast } from '../../stores/toastStore'
import { errorMessage, formatCount, formatDuration, formatPublishTime } from '../../lib/format'
import { uid } from '../../lib/id'
import type { MockVideo, Platform } from '../../types'

// 我的竞品库: 用户自己导入的竞品视频池, 作为「我的竞品库」竞争环境的干扰来源。
// 全部数据保存在本浏览器 IndexedDB, 不上传服务器。

type AnyPlatform = Platform | 'any'

function MockThumb({ video }: { video: MockVideo }) {
  const url = useAssetUrl(video.thumbAssetId ?? null)
  const src = url ?? video.thumbSrcUrl ?? builtinMockThumb(video.id, video.title)
  return <img src={src} alt="" className="h-11 w-[78px] shrink-0 rounded object-cover" draggable={false} referrerPolicy="no-referrer" />
}

function platformLabel(p: Platform | undefined): string {
  return p === 'youtube' ? '油管' : p === 'bilibili' ? 'B站' : '不限平台'
}

function MockRow({
  video,
  index,
  total,
  onEdit,
  onDelete,
  onToggle,
  onMove,
}: {
  video: MockVideo
  index: number
  total: number
  onEdit: () => void
  onDelete: () => void
  onToggle: (v: boolean) => void
  onMove: (dir: -1 | 1) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[#23252e] bg-[#14161c] px-2.5 py-2">
      <Checkbox checked={video.enabled} onChange={onToggle} />
      <MockThumb video={video} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-zinc-200">{video.title}</div>
        <div className="mt-0.5 text-[11px] text-zinc-500">
          {video.channel} · {formatCount(video.views)}播放 · {video.danmaku ? `${formatCount(video.danmaku)}弹幕 · ` : ''}
          {formatDuration(video.durationSec)} · {formatPublishTime(video.publishedHoursAgo)} · {platformLabel(video.platform)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 text-zinc-500">
        <button className="p-1 hover:text-zinc-200 disabled:opacity-30" title="上移" onClick={() => onMove(-1)} disabled={index === 0}>
          <ArrowUp size={14} />
        </button>
        <button className="p-1 hover:text-zinc-200 disabled:opacity-30" title="下移" onClick={() => onMove(1)} disabled={index === total - 1}>
          <ArrowDown size={14} />
        </button>
        <button className="p-1 hover:text-zinc-200" title="编辑" onClick={onEdit}>
          <Pencil size={14} />
        </button>
        <button className="p-1 hover:text-red-400" title="删除" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

interface MockDraft {
  title: string
  channel: string
  views: number
  danmaku: number
  durationSec: number
  publishedHoursAgo: number
  platform: AnyPlatform
}

const EMPTY_DRAFT: MockDraft = { title: '', channel: '', views: 120000, danmaku: 2400, durationSec: 600, publishedHoursAgo: 48, platform: 'any' }

/** 编辑/新建共用的字段表单(不含封面, 封面由专门的按钮处理) */
function MockFields({ draft, setDraft }: { draft: MockDraft; setDraft: (d: MockDraft) => void }) {
  return (
    <div className="space-y-2.5">
      <TextInput className="w-full" placeholder="视频标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <TextInput className="w-full" placeholder="频道 / UP 主名" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">平台</span>
        <Segmented<AnyPlatform>
          value={draft.platform}
          onChange={(v) => setDraft({ ...draft, platform: v })}
          options={[
            { value: 'any', label: '不限' },
            { value: 'bilibili', label: 'B站' },
            { value: 'youtube', label: '油管' },
          ]}
        />
        <span className="text-[11px] text-zinc-600">不限 = 两种平台的测试中都会出现</span>
      </div>
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
    </div>
  )
}

function MockCoverPicker({
  assetId,
  previewFile,
  onPick,
  onRemove,
}: {
  assetId?: string
  previewFile?: File | null
  onPick: (f: File) => void
  onRemove?: () => void
}) {
  const dbUrl = useAssetUrl(assetId ?? null)
  const [objUrl, setObjUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!previewFile) {
      setObjUrl(null)
      return
    }
    const u = URL.createObjectURL(previewFile)
    setObjUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [previewFile])
  const url = objUrl ?? dbUrl
  const inputRef = useRef<HTMLInputElement>(null)
  const showRemove = assetId != null || previewFile != null
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex aspect-video w-[124px] items-center justify-center overflow-hidden rounded-md border border-[#2f323c] bg-black/40">
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-[11px] text-zinc-600">可选封面</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onPick(e.target.files[0]); e.target.value = '' }} />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          <Upload size={13} /> {assetId || previewFile ? '更换' : '封面'}
        </Button>
        {showRemove && onRemove ? (
          <Button size="sm" onClick={onRemove}>
            移除
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function MockVideosTab() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  const [draft, setDraft] = useState<MockDraft>(EMPTY_DRAFT)
  const [thumbFile, setThumbFile] = useState<File | null>(null)

  // 批量创建
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [batchChannel, setBatchChannel] = useState('')
  const [batchPlatform, setBatchPlatform] = useState<AnyPlatform>('any')
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const batchInputRef = useRef<HTMLInputElement>(null)

  // 编辑
  const [editing, setEditing] = useState<MockVideo | null>(null)
  const [editDraft, setEditDraft] = useState<MockDraft>(EMPTY_DRAFT)
  const [editNewFile, setEditNewFile] = useState<File | null>(null)
  const [editRemoveCover, setEditRemoveCover] = useState(false)

  if (!project) return null

  const customs = [...project.mockVideos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const enabledCount = customs.filter((m) => m.enabled).length
  const nextOrder = () => (customs.length > 0 ? Math.max(...customs.map((m) => m.order ?? 0)) + 1 : 0)

  const platformOf = (p: AnyPlatform): Platform | undefined => (p === 'any' ? undefined : p)

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
        channel: draft.channel.trim() || '竞品频道',
        views: draft.views,
        danmaku: draft.danmaku > 0 ? draft.danmaku : undefined,
        durationSec: draft.durationSec,
        publishedHoursAgo: draft.publishedHoursAgo,
        platform: platformOf(draft.platform),
        thumbAssetId,
        custom: true,
        enabled: true,
        order: nextOrder(),
      })
    })
    setDraft(EMPTY_DRAFT)
    setThumbFile(null)
    toast.success('已添加到竞品库')
  }

  const addBatch = async () => {
    const titles = batchText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (titles.length === 0) {
      toast.error('请输入至少一个标题(每行一个)')
      return
    }
    let order = nextOrder()
    const created: MockVideo[] = []
    let failed = 0
    for (let i = 0; i < titles.length; i++) {
      let thumbAssetId: string | undefined
      const file = batchFiles[i]
      if (file) {
        try {
          const asset = await buildStoredAsset(file, 'mock-thumb', project.id)
          await assetRepository.put(asset)
          thumbAssetId = asset.id
        } catch (e) {
          failed += 1
          toast.error(`封面「${file.name}」无效:${errorMessage(e)}`)
        }
      }
      created.push({
        id: uid(),
        title: titles[i],
        channel: batchChannel.trim() || '竞品频道',
        views: 80000,
        durationSec: 480,
        publishedHoursAgo: 72,
        platform: platformOf(batchPlatform),
        thumbAssetId,
        custom: true,
        enabled: true,
        order: order++,
      })
    }
    update((p) => {
      p.mockVideos.push(...created)
    })
    setBatchText('')
    setBatchFiles([])
    toast.success(`已批量创建 ${created.length} 条竞品视频${failed ? `(${failed} 个封面无效)` : ''}, 可逐条编辑数据`)
  }

  const moveMock = (id: string, dir: -1 | 1) => {
    const list = [...customs]
    const idx = list.findIndex((m) => m.id === id)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= list.length) return
    const tmp = list[idx]
    list[idx] = list[target]
    list[target] = tmp
    update((p) => {
      list.forEach((m, i) => {
        const x = p.mockVideos.find((y) => y.id === m.id)
        if (x) x.order = i
      })
    })
  }

  const deleteMock = (m: MockVideo) => {
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
  }

  const openEdit = (m: MockVideo) => {
    setEditing(m)
    setEditDraft({
      title: m.title,
      channel: m.channel,
      views: m.views,
      danmaku: m.danmaku ?? 0,
      durationSec: m.durationSec,
      publishedHoursAgo: m.publishedHoursAgo,
      platform: m.platform ?? 'any',
    })
    setEditNewFile(null)
    setEditRemoveCover(false)
  }

  const saveEdit = async () => {
    if (!editing) return
    if (!editDraft.title.trim()) {
      toast.error('标题不能为空')
      return
    }
    let newAssetId: string | undefined
    if (editNewFile) {
      try {
        const asset = await buildStoredAsset(editNewFile, 'mock-thumb', project.id)
        await assetRepository.put(asset)
        newAssetId = asset.id
      } catch (e) {
        toast.error(`封面无效:${errorMessage(e)}`)
        return
      }
    }
    const oldAsset = editing.thumbAssetId
    update((p) => {
      const x = p.mockVideos.find((y) => y.id === editing.id)
      if (!x) return
      x.title = editDraft.title.trim()
      x.channel = editDraft.channel.trim() || '竞品频道'
      x.views = editDraft.views
      x.danmaku = editDraft.danmaku > 0 ? editDraft.danmaku : undefined
      x.durationSec = editDraft.durationSec
      x.publishedHoursAgo = editDraft.publishedHoursAgo
      x.platform = platformOf(editDraft.platform)
      if (newAssetId) {
        x.thumbAssetId = newAssetId
        x.thumbSrcUrl = undefined
      }
      if (editRemoveCover) {
        x.thumbAssetId = undefined
        x.thumbSrcUrl = undefined
      }
    })
    // 旧封面若不再被引用则清理
    if ((newAssetId || editRemoveCover) && oldAsset) {
      setTimeout(() => {
        const cur = useProjectStore.getState().project
        if (cur) void assetRepository.deleteOrphan(oldAsset, cur)
      }, 500)
    }
    setEditing(null)
    setEditNewFile(null)
    toast.success('已保存')
  }

  return (
    <div className="space-y-4">
      <SectionCard title="我的竞品库" hint={`「我的竞品库」竞争环境的干扰来源 · 已启用 ${enabledCount} / ${customs.length} 条 · 数据保存在本浏览器`}>
        <p className="mb-3 text-xs leading-relaxed text-zinc-500">
          把你要对标的竞品视频导入这里。选择「我的竞品库」竞争环境后,信息流中的干扰视频将完全来自这个库 ——
          让你的封面和真实的竞品同台比较。至少导入 4 条效果更好,数量不足时视频会重复出现。
        </p>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <MockCoverPicker
            previewFile={thumbFile}
            onPick={(f) => setThumbFile(f)}
            onRemove={() => setThumbFile(null)}
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            <TextInput className="w-full" placeholder="视频标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <TextInput className="w-full" placeholder="频道 / UP 主名" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">平台</span>
              <Segmented<AnyPlatform>
                value={draft.platform}
                onChange={(v) => setDraft({ ...draft, platform: v })}
                options={[
                  { value: 'any', label: '不限' },
                  { value: 'bilibili', label: 'B站' },
                  { value: 'youtube', label: '油管' },
                ]}
              />
              <span className="text-[11px] text-zinc-600">不限 = 两种平台的测试中都会出现</span>
            </div>
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
              <Plus size={14} /> 添加到竞品库
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="批量创建" hint="每行一个标题, 封面按顺序与标题对应">
        {batchOpen ? (
          <div className="space-y-3">
            <TextArea rows={5} placeholder={'每行一个竞品视频标题:\n竞品标题示例一\n竞品标题示例二'} value={batchText} onChange={(e) => setBatchText(e.target.value)} />
            <div className="flex flex-wrap items-center gap-3">
              <TextInput className="w-44" placeholder="频道名(可选,统一)" value={batchChannel} onChange={(e) => setBatchChannel(e.target.value)} />
              <Segmented<AnyPlatform>
                value={batchPlatform}
                onChange={setBatchPlatform}
                options={[
                  { value: 'any', label: '不限平台' },
                  { value: 'bilibili', label: 'B站' },
                  { value: 'youtube', label: '油管' },
                ]}
              />
              <input ref={batchInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { setBatchFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              <Button size="sm" onClick={() => batchInputRef.current?.click()}>
                <Upload size={13} /> 批量上传封面{batchFiles.length ? `(${batchFiles.length})` : ''}
              </Button>
              <Button variant="primary" onClick={() => void addBatch()}>
                批量创建
              </Button>
            </div>
            {batchFiles.length ? (
              <ul className="space-y-0.5 text-[11px] text-zinc-500">
                {batchFiles.slice(0, 6).map((f, i) => (
                  <li key={i}>
                    {i + 1}. {f.name} → 对应第 {i + 1} 行标题
                  </li>
                ))}
                {batchFiles.length > 6 ? <li>…共 {batchFiles.length} 个封面</li> : null}
              </ul>
            ) : (
              <p className="text-[11px] text-zinc-600">不选封面则创建无封面条目, 之后可在列表中逐条上传。</p>
            )}
          </div>
        ) : (
          <Button size="sm" onClick={() => setBatchOpen(true)}>
            <Layers size={14} /> 批量创建(标题多行 + 封面多选)
          </Button>
        )}
      </SectionCard>

      {customs.length > 0 ? (
        <SectionCard title={`竞品视频(${customs.length})`} hint="按此顺序进入信息流候选池">
          <div className="space-y-1.5">
            {customs.map((m, i) => (
              <MockRow
                key={m.id}
                video={m}
                index={i}
                total={customs.length}
                onEdit={() => openEdit(m)}
                onDelete={() => deleteMock(m)}
                onToggle={(v) =>
                  update((p) => {
                    const x = p.mockVideos.find((y) => y.id === m.id)
                    if (x) x.enabled = v
                  })
                }
                onMove={(dir) => moveMock(m.id, dir)}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title={`内置干扰视频库(${BUILTIN_MOCK_VIDEOS.length})`}
        hint="用于「全站」环境;取消勾选 = 不参与该项目的测试。"
      >
        <div className="space-y-1.5">
          {BUILTIN_MOCK_VIDEOS.map((m) => {
            const enabled = !project.disabledBuiltinMockIds.includes(m.id)
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-md border border-[#23252e] bg-[#14161c] px-2.5 py-2">
                <Checkbox
                  checked={enabled}
                  onChange={(v) =>
                    update((p) => {
                      if (v) p.disabledBuiltinMockIds = p.disabledBuiltinMockIds.filter((id) => id !== m.id)
                      else if (!p.disabledBuiltinMockIds.includes(m.id)) p.disabledBuiltinMockIds.push(m.id)
                    })
                  }
                />
                <MockThumb video={m} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-zinc-200">{m.title}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {m.channel} · {formatCount(m.views)}播放 · {formatDuration(m.durationSec)} · {formatPublishTime(m.publishedHoursAgo)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <div className="flex items-center gap-2 rounded-lg border border-[#23252e] bg-[#12141a] px-4 py-3 text-xs text-zinc-500">
        <Database size={14} />
        测试时会按所选竞争环境抽取干扰视频:「全站」= 内置库或真实热门池(竞品库中「不限平台」条目也会加入);「Minecraft」= MC 分区池;「我的竞品库」= 仅竞品库启用条目。
      </div>

      {/* 编辑弹窗 */}
      <Modal
        open={!!editing}
        title="编辑竞品视频"
        onClose={() => setEditing(null)}
        width={560}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>取消</Button>
            <Button variant="primary" onClick={() => void saveEdit()}>
              保存
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="flex items-start gap-4">
            <MockCoverPicker
              assetId={editNewFile ? undefined : editRemoveCover ? undefined : editing.thumbAssetId}
              previewFile={editNewFile}
              onPick={(f) => {
                setEditNewFile(f)
                setEditRemoveCover(false)
              }}
              onRemove={() => {
                setEditRemoveCover(true)
                setEditNewFile(null)
              }}
            />
            <div className="min-w-0 flex-1">
              <MockFields draft={editDraft} setDraft={setEditDraft} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

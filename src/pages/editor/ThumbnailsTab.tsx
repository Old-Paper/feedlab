import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Crop, Trash2, Upload, Image as ImageIcon } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { assetRepository } from '../../db/repositories/projectRepository'
import { buildStoredAsset, stripExt } from '../../lib/image'
import { defaultCrops, type ThumbnailItem } from '../../types'
import { Button, ConfirmModal, EmptyState, IconButton, SectionCard } from '../../components/ui'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { toast } from '../../stores/toastStore'
import { errorMessage } from '../../lib/format'
import { uid } from '../../lib/id'
import { CropEditorModal } from './CropEditorModal'

function ThumbCard({
  thumb,
  index,
  total,
  onCrop,
}: {
  thumb: ThumbnailItem
  index: number
  total: number
  onCrop: (t: ThumbnailItem) => void
}) {
  const url = useAssetUrl(thumb.assetId)
  const update = useProjectStore((s) => s.updateProject)

  const move = (dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= total) return
    update((p) => {
      const arr = p.thumbnails
      const a = arr.find((x) => x.id === thumb.id)
      const b = arr.find((x) => x.id === arr[target].id)
      if (a && b) {
        const tmp = a.order
        a.order = b.order
        b.order = tmp
        arr.sort((x, y) => x.order - y.order)
      }
    })
  }

  const duplicate = () => {
    update((p) => {
      const src = p.thumbnails.find((t) => t.id === thumb.id)
      if (!src) return
      p.thumbnails.push({ ...structuredClone(src), id: uid(), name: `${src.name} 副本`, order: p.thumbnails.length })
    })
  }

  return (
    <div className="rounded-lg border border-[#23252e] bg-[#14161c] p-2">
      <div className="relative mb-2 aspect-video overflow-hidden rounded-md bg-black">
        {url ? (
          <img src={url} alt={thumb.name} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">图片加载失败</div>
        )}
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-zinc-300">
          {thumb.width} × {thumb.height}
        </span>
      </div>
      <input
        value={thumb.name}
        onChange={(e) =>
          update((p) => {
            const t = p.thumbnails.find((x) => x.id === thumb.id)
            if (t) t.name = e.target.value
          })
        }
        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-zinc-200 outline-none hover:border-[#2f323c] focus:border-indigo-500/70"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex gap-0.5">
          <IconButton title="上移" onClick={() => move(-1)} disabled={index === 0}>
            <ArrowUp size={13} />
          </IconButton>
          <IconButton title="下移" onClick={() => move(1)} disabled={index === total - 1}>
            <ArrowDown size={13} />
          </IconButton>
        </div>
        <div className="flex gap-0.5">
          <IconButton title="裁剪构图" onClick={() => onCrop(thumb)}>
            <Crop size={13} />
          </IconButton>
          <IconButton title="复制" onClick={duplicate}>
            <Copy size={13} />
          </IconButton>
          <DeleteThumbButton thumbId={thumb.id} />
        </div>
      </div>
    </div>
  )
}

function DeleteThumbButton({ thumbId }: { thumbId: string }) {
  const [open, setOpen] = useState(false)
  const update = useProjectStore((s) => s.updateProject)
  const project = useProjectStore((s) => s.project)

  const onDelete = () => {
    if (!project) return
    const assetId = project.thumbnails.find((t) => t.id === thumbId)?.assetId
    update((p) => {
      p.thumbnails = p.thumbnails.filter((t) => t.id !== thumbId)
      p.thumbnails.forEach((t, i) => (t.order = i))
      // Also drop candidates that referenced it.
      for (const c of p.candidates) {
        if (c.thumbnailId === thumbId) c.thumbnailId = null
      }
    })
    if (assetId && project) {
      // After the store update the asset may still be referenced by copies.
      setTimeout(() => {
        const current = useProjectStore.getState().project
        if (current && assetId) void assetRepository.deleteOrphan(assetId, current)
      }, 500)
    }
  }

  return (
    <>
      <IconButton title="删除" onClick={() => setOpen(true)}>
        <Trash2 size={13} />
      </IconButton>
      <ConfirmModal
        open={open}
        title="删除封面"
        message="删除这张封面?引用它的 Candidate 会失去封面(不会自动删除)。"
        onConfirm={onDelete}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

export function ThumbnailsTab() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [cropTarget, setCropTarget] = useState<ThumbnailItem | null>(null)
  if (!project) return null

  const addFiles = async (files: FileList | File[]) => {
    let ok = 0
    for (const file of Array.from(files)) {
      try {
        const asset = await buildStoredAsset(file, 'thumbnail', project.id)
        await assetRepository.put(asset)
        update((p) => {
          p.thumbnails.push({
            id: uid(),
            name: stripExt(asset.name),
            assetId: asset.id,
            width: asset.width,
            height: asset.height,
            createdAt: Date.now(),
            order: p.thumbnails.length,
            crop: defaultCrops(),
          })
        })
        ok += 1
      } catch (e) {
        toast.error(`${file.name}:${errorMessage(e)}`)
      }
    }
    if (ok > 0) toast.success(`已添加 ${ok} 张封面`)
  }

  const sorted = [...project.thumbnails].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      <SectionCard title="上传封面">
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 transition-colors ${
            dragOver ? 'border-indigo-400 bg-indigo-500/5' : 'border-[#2f323c]'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void addFiles(e.dataTransfer.files)
          }}
        >
          <Upload size={22} className="text-zinc-500" />
          <div className="text-[13px] text-zinc-400">拖拽图片到此处,或</div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()}>
            选择文件(可多选)
          </Button>
          <div className="text-[11px] text-zinc-600">支持 PNG / JPG / WEBP,单张 ≤ 20MB,原图会保存到浏览器 IndexedDB</div>
        </div>
      </SectionCard>

      <SectionCard title={`封面库(${project.thumbnails.length})`}>
        {sorted.length === 0 ? (
          <EmptyState icon={<ImageIcon size={28} />} title="还没有封面" hint="上传至少一张封面才能生成 Candidate 并开始测试。" />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((t, i) => (
              <ThumbCard key={t.id} thumb={t} index={i} total={sorted.length} onCrop={setCropTarget} />
            ))}
          </div>
        )}
      </SectionCard>

      {cropTarget ? <CropEditorModal thumbnail={cropTarget} onClose={() => setCropTarget(null)} /> : null}
    </div>
  )
}

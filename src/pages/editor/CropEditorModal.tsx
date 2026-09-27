import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { Button, Modal, Segmented } from '../../components/ui'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { getThumbTransform } from '../../lib/crop'
import { clamp } from '../../lib/format'
import { DEFAULT_CROP, type PlatformEnv, type Platform, type Device, type ThumbnailItem, type CropState } from '../../types'

const ENVS: Array<{ env: PlatformEnv; label: string }> = [
  { env: 'youtube-desktop', label: 'YT 桌面' },
  { env: 'youtube-mobile', label: 'YT 手机' },
  { env: 'bilibili-desktop', label: 'B站 桌面' },
  { env: 'bilibili-mobile', label: 'B站 手机' },
]

/**
 * Per-platform crop editor: zoom + pan, saved independently for each of the
 * four environments because the same source art may want different framing.
 */
export function CropEditorModal({ thumbnail, onClose }: { thumbnail: ThumbnailItem; onClose: () => void }) {
  const url = useAssetUrl(thumbnail.assetId)
  const update = useProjectStore((s) => s.updateProject)
  const [draft, setDraft] = useState<Record<PlatformEnv, CropState>>(() => structuredClone(thumbnail.crop))
  const [env, setEnv] = useState<PlatformEnv>('youtube-desktop')
  const [platform, device] = env.split('-') as [Platform, Device]

  const c = draft[env]
  const setCrop = (patch: Partial<CropState>) => setDraft((d) => ({ ...d, [env]: { ...d[env], ...patch } }))

  const save = () => {
    update((p) => {
      const t = p.thumbnails.find((x) => x.id === thumbnail.id)
      if (t) t.crop = structuredClone(draft)
    })
    onClose()
  }

  return (
    <Modal
      open
      title={`封面构图 · ${thumbnail.name}`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={save}>
            保存构图
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented<PlatformEnv>
          value={env}
          onChange={(v) => setEnv(v)}
          options={ENVS.map((e) => ({ value: e.env, label: e.label }))}
        />
        <div className="text-[11px] text-zinc-600">
          预览比例 16:9,与 {platform === 'youtube' ? 'YouTube' : 'Bilibili'} {device === 'desktop' ? '桌面端' : '手机端'}一致(裁切方式:cover)
        </div>
        <div className="mx-auto aspect-video max-w-[560px] overflow-hidden rounded-md bg-black">
          {url ? (
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              style={{ transform: getThumbTransform(draft, env), transformOrigin: 'center center' }}
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-600">图片加载失败</div>
          )}
        </div>
        <div className="space-y-2.5">
          <Slider label={`缩放 Zoom (${c.zoom.toFixed(2)}×)`} min={1} max={3} step={0.01} value={c.zoom} onChange={(v) => setCrop({ zoom: clamp(v, 1, 3) })} />
          <Slider label={`水平 Move X (${c.x.toFixed(2)})`} min={-1} max={1} step={0.01} value={c.x} onChange={(v) => setCrop({ x: clamp(v, -1, 1) })} disabled={c.zoom <= 1} />
          <Slider label={`垂直 Move Y (${c.y.toFixed(2)})`} min={-1} max={1} step={0.01} value={c.y} onChange={(v) => setCrop({ y: clamp(v, -1, 1) })} disabled={c.zoom <= 1} />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-600">提示:平移只在 Zoom &gt; 1 时生效,避免露出黑边</span>
            <Button
              size="sm"
              onClick={() => setCrop({ ...DEFAULT_CROP })}
            >
              <RotateCcw size={13} /> 重置当前平台
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Slider({ label, min, max, step, value, onChange, disabled }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <span className={`w-44 shrink-0 text-xs ${disabled ? 'text-zinc-600' : 'text-zinc-300'}`}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-indigo-500 disabled:opacity-30"
      />
      </label>
  )
}


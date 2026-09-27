import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { assetRepository } from '../../db/repositories/projectRepository'
import { buildStoredAsset } from '../../lib/image'
import { Button, Field, NumberInput, SectionCard, Segmented, TextInput } from '../../components/ui'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { toast } from '../../stores/toastStore'
import { errorMessage } from '../../lib/format'
import type { MetadataMode } from '../../types'

export function ChannelTab() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  const fileRef = useRef<HTMLInputElement>(null)
  const avatarUrl = useAssetUrl(project?.channel.avatarAssetId ?? null)
  if (!project) return null

  const ch = project.channel

  const uploadAvatar = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const asset = await buildStoredAsset(files[0], 'avatar', project.id)
      await assetRepository.put(asset)
      update((p) => {
        p.channel.avatarAssetId = asset.id
      })
      toast.success('头像已更新')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const num = (v: number, onChange: (n: number) => void) => (
    <NumberInput value={v} onChange={(e) => onChange(Number(e.target.value) || 0)} />
  )

  return (
    <div className="space-y-4">
      <SectionCard title="频道身份(通用)">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#23252d] text-xl font-semibold text-zinc-400">
                  {(ch.name || '频').slice(0, 1)}
                </div>
              )}
              {avatarUrl ? (
                <button
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2a2d36] text-zinc-400 hover:text-zinc-100"
                  onClick={() => update((p) => { p.channel.avatarAssetId = null })}
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void uploadAvatar(e.target.files)} />
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> 上传头像
            </Button>
          </div>
          <div className="flex-1 space-y-3">
            <Field label="频道显示名" hint="Find Target 模式会用这个名字提示观察者">
              <TextInput className="w-72" value={ch.name} onChange={(e) => update((p) => { p.channel.name = e.target.value })} />
            </Field>
            <Field label="元数据模式" hint="随机 = 每次生成 Feed 时在固定值附近抖动播放量/时间等">
              <Segmented<MetadataMode>
                value={ch.metadataMode}
                onChange={(v) => update((p) => { p.channel.metadataMode = v })}
                options={[
                  { value: 'fixed', label: '固定数据' },
                  { value: 'random', label: '随机数据' },
                ]}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="YouTube 频道资料">
          <div className="grid grid-cols-2 gap-3">
            <Field label="频道名" hint="留空使用通用名">
              <TextInput className="w-full" value={ch.youtube.channelName} placeholder={ch.name} onChange={(e) => update((p) => { p.channel.youtube.channelName = e.target.value })} />
            </Field>
            <Field label="播放量">
              {num(ch.youtube.views, (n) => update((p) => { p.channel.youtube.views = n }))}
            </Field>
            <Field label="视频时长(秒)">
              {num(ch.youtube.durationSec, (n) => update((p) => { p.channel.youtube.durationSec = n }))}
            </Field>
            <Field label="发布于几小时前">
              {num(ch.youtube.publishedHoursAgo, (n) => update((p) => { p.channel.youtube.publishedHoursAgo = n }))}
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Bilibili UP 主资料">
          <div className="grid grid-cols-2 gap-3">
            <Field label="UP 主名" hint="留空使用通用名">
              <TextInput className="w-full" value={ch.bilibili.uploaderName} placeholder={ch.name} onChange={(e) => update((p) => { p.channel.bilibili.uploaderName = e.target.value })} />
            </Field>
            <Field label="播放量">
              {num(ch.bilibili.views, (n) => update((p) => { p.channel.bilibili.views = n }))}
            </Field>
            <Field label="弹幕数">
              {num(ch.bilibili.danmaku, (n) => update((p) => { p.channel.bilibili.danmaku = n }))}
            </Field>
            <Field label="视频时长(秒)">
              {num(ch.bilibili.durationSec, (n) => update((p) => { p.channel.bilibili.durationSec = n }))}
            </Field>
            <Field label="发布于几小时前">
              {num(ch.bilibili.publishedHoursAgo, (n) => update((p) => { p.channel.bilibili.publishedHoursAgo = n }))}
            </Field>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

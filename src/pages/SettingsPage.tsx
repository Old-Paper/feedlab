import { useEffect, useRef, useState } from 'react'
import { Database, Download, HardDrive, Trash2, Upload } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useProjectListStore } from '../stores/projectListStore'
import { exportAllProjects, importProjectsFromFile } from '../features/io/projectIO'
import { Button, Field, SectionCard, Segmented } from '../components/ui'
import { toast } from '../stores/toastStore'
import { errorMessage } from '../lib/format'
import type { Device, Platform, ThemeMode } from '../types'
import { db } from '../db/database'

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const loaded = useSettingsStore((s) => s.loaded)
  const load = useSettingsStore((s) => s.load)
  const patch = useSettingsStore((s) => s.patch)
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loaded) void load()
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null && e.quota != null) setUsage({ used: e.usage, quota: e.quota })
    })
  }, [loaded, load])

  const onImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const summary = await importProjectsFromFile(files[0])
      toast.success(`已导入:${summary.names.join('、')}`)
      await useProjectListStore.getState().load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <h1 className="text-lg font-bold text-zinc-100">设置</h1>

        <SectionCard title="新项目默认环境">
          <div className="flex flex-wrap items-end gap-5">
            <Field label="默认平台">
              <Segmented<Platform>
                value={settings.defaultPlatform}
                onChange={(v) => void patch({ defaultPlatform: v })}
                options={[
                  { value: 'youtube', label: 'YouTube' },
                  { value: 'bilibili', label: 'Bilibili' },
                ]}
              />
            </Field>
            <Field label="默认设备">
              <Segmented<Device>
                value={settings.defaultDevice}
                onChange={(v) => void patch({ defaultDevice: v })}
                options={[
                  { value: 'desktop', label: '桌面端' },
                  { value: 'mobile', label: '手机端' },
                ]}
              />
            </Field>
            <Field label="默认主题">
              <Segmented<ThemeMode>
                value={settings.defaultTheme}
                onChange={(v) => void patch({ defaultTheme: v })}
                options={[
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                ]}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="数据与存储">
          <div className="space-y-3 text-[13px] text-zinc-400">
            <div className="flex items-center gap-2">
              <HardDrive size={15} className="text-zinc-500" />
              {usage ? (
                <span>
                  IndexedDB 已使用 <span className="tabular-nums text-zinc-200">{mb(usage.used)}</span> / 配额约 {mb(usage.quota)}
                </span>
              ) : (
                <span>浏览器未提供存储用量信息</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  void exportAllProjects()
                    .then((name) => toast.success(`已导出 ${name}`))
                    .catch((e) => toast.error(errorMessage(e)))
                }}
              >
                <Download size={14} /> 导出全部项目(含图片)
              </Button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void onImport(e.target.files)} />
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> 导入项目文件
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="危险区域">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[13px] text-zinc-400">
              <div className="flex items-center gap-2">
                <Database size={15} className="text-zinc-500" />
                删除浏览器中的全部数据
              </div>
              <p className="mt-1 text-xs text-zinc-600">包括所有项目、上传的图片和测试记录。此操作无法撤销。</p>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('确定删除全部数据?所有项目、图片与测试记录都会被清除。')) {
                  void db
                    .delete()
                    .then(() => {
                      toast.success('已清空,页面即将刷新')
                      setTimeout(() => window.location.reload(), 600)
                    })
                    .catch((e) => toast.error(errorMessage(e)))
                }
              }}
            >
              <Trash2 size={14} /> 清空全部数据
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="关于">
          <p className="text-[13px] leading-relaxed text-zinc-400">
            FeedLab 用于在尽量还原的 YouTube / Bilibili 推荐流环境中测试封面与标题的第一眼吸引力。
            所有数据仅保存在本浏览器(IndexedDB),不会上传到任何服务器。
            项目文档见 <code className="rounded bg-[#1a1c23] px-1 text-xs">README.md</code>。
          </p>
        </SectionCard>
      </div>
    </div>
  )
}

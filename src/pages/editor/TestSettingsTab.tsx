import { Dices } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { Button, Checkbox, Field, NumberInput, SectionCard, Segmented, Select, TextInput, IconButton } from '../../components/ui'
import { MockCountPicker, ViewportPicker } from '../../components/TestSetupBar'
import { randomSeed } from '../../features/testing/randomEngine'
import type { BlindDuration, Device, Platform, PositionMode, Project, ThemeMode } from '../../types'

const ROUND_OPTIONS = [1, 5, 10, 20, 50]

export function TestSettingsTab() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  if (!project) return null
  const s = project.testSettings
  const enabled = project.candidates.filter((c) => c.enabled)

  const set = (patch: Partial<Project['testSettings']>) =>
    update((p) => {
      p.testSettings = { ...p.testSettings, ...patch }
    })

  const roundsCustom = !ROUND_OPTIONS.includes(s.rounds)

  return (
    <div className="space-y-4">
      <SectionCard title="环境" hint="作为每次打开模拟器 / 测试页时的默认值">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="平台">
            <Segmented<Platform>
              value={s.platform}
              onChange={(v) => set({ platform: v })}
              options={[
                { value: 'youtube', label: 'YouTube' },
                { value: 'bilibili', label: 'Bilibili' },
              ]}
            />
          </Field>
          <Field label="设备">
            <Segmented<Device>
              value={s.device}
              onChange={(v) =>
                set(
                  v === 'desktop'
                    ? { device: v, viewportPresetId: '1920x1080', viewportWidth: 1920, viewportHeight: 1080 }
                    : { device: v, viewportPresetId: '390x844', viewportWidth: 390, viewportHeight: 844 },
                )
              }
              options={[
                { value: 'desktop', label: '桌面端' },
                { value: 'mobile', label: '手机端' },
              ]}
            />
          </Field>
          <Field label="主题">
            <Segmented<ThemeMode>
              value={s.theme}
              onChange={(v) => set({ theme: v })}
              options={[
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
              ]}
            />
          </Field>
          <Field label="Viewport">
            <ViewportPicker
              device={s.device}
              presetId={s.viewportPresetId}
              width={s.viewportWidth}
              height={s.viewportHeight}
              onChange={(v) => set(v)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="信息流构成">
        <div className="flex flex-wrap items-end gap-5">
          <Field label="干扰视频数量">
            <MockCountPicker value={s.mockCount} onChange={(v) => set({ mockCount: v })} />
          </Field>
          <div className="flex flex-col gap-2 pb-0.5">
            <Checkbox label="打乱信息流顺序(Randomize Feed Order)" checked={s.randomizeFeedOrder} onChange={(v) => set({ randomizeFeedOrder: v })} />
            <Checkbox label="随机化元数据(播放量 / 弹幕 / 时间抖动)" checked={s.randomizeMetadata} onChange={(v) => set({ randomizeMetadata: v })} />
            <Checkbox
              label={
                <span title="开启后干扰视频使用每日自动抓取的真实视频(按当前平台: 全站最火 + 不太火混合),当天固定、次日更新;油管数据由部署服务器每日抓取">
                  干扰视频使用真实封面池(每日更新)
                </span>
              }
              checked={s.useRealPool}
              onChange={(v) => set({ useRealPool: v })}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Candidate 位置">
        <div className="flex flex-wrap items-end gap-5">
          <Field label="位置模式" hint="随机模式下位置同样参与均衡调度">
            <Segmented<PositionMode>
              value={s.positionMode}
              onChange={(v) => set({ positionMode: v })}
              options={[
                { value: 'random', label: 'Random' },
                { value: 'fixed', label: 'Fixed' },
              ]}
            />
          </Field>
          {s.positionMode === 'fixed' ? (
            <Field label="固定位置(第几个,1 开始)" hint={`当前信息流共 ${s.mockCount + 1} 个位置`}>
              <NumberInput min={1} value={s.fixedPosition} onChange={(e) => set({ fixedPosition: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Seed 与可复现性">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <Checkbox label="固定 Seed(相同 Seed + 相同配置 = 完全相同 Feed)" checked={s.useFixedSeed} onChange={(v) => set({ useFixedSeed: v })} />
          </div>
          <Field label="Seed">
            <div className="flex items-center gap-1.5">
              <TextInput className="w-44 font-mono text-xs" value={s.seed} onChange={(e) => set({ seed: e.target.value })} />
              <IconButton title="随机新 Seed" onClick={() => set({ seed: randomSeed() })}>
                <Dices size={15} />
              </IconButton>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="盲测 / 找目标">
        <div className="flex flex-wrap items-end gap-5">
          <Field label="每轮展示时长(盲测)">
            <Segmented<BlindDuration>
              value={s.blindDuration}
              onChange={(v) => set({ blindDuration: v })}
              options={[
                { value: 3, label: '3s' },
                { value: 5, label: '5s' },
                { value: 10, label: '10s' },
                { value: 0, label: '不限' },
              ]}
            />
          </Field>
          <Field label="测试轮数" hint="Candidate 会做均衡曝光调度">
            <div className="flex items-center gap-1.5">
              <Select value={roundsCustom ? 'custom' : String(s.rounds)} onChange={(e) => set({ rounds: e.target.value === 'custom' ? s.rounds : Number(e.target.value) })}>
                {ROUND_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} 轮
                  </option>
                ))}
                <option value="custom">自定义</option>
              </Select>
              {roundsCustom ? <NumberInput min={1} value={s.rounds} onChange={(e) => set({ rounds: Math.max(1, Number(e.target.value) || 1) })} className="w-16" /> : null}
            </div>
          </Field>
          <Field label="Candidate 范围" hint="单个 = 只测这一条;全部 = 均衡轮换">
            <div className="flex items-center gap-2">
              <Segmented<'all' | 'single'>
                value={s.candidateScope}
                onChange={(v) => set({ candidateScope: v })}
                options={[
                  { value: 'all', label: '全部均衡' },
                  { value: 'single', label: '指定单个' },
                ]}
              />
              {s.candidateScope === 'single' ? (
                <Select value={s.singleCandidateId ?? ''} onChange={(e) => set({ singleCandidateId: e.target.value || null })}>
                  <option value="">选择…</option>
                  {enabled.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </Field>
        </div>
        {enabled.length === 0 ? (
          <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            当前没有启用的 Candidate,先到「Candidate 组合」页签生成并启用。
          </div>
        ) : null}
        <div className="mt-3 flex justify-end">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(JSON.stringify(s, null, 2)).catch(() => undefined)
            }}
          >
            复制设置 JSON
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

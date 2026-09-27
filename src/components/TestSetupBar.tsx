import { Dices, ExternalLink, Eye, Moon, Shuffle, Sun } from 'lucide-react'
import { useState } from 'react'
import { DESKTOP_VIEWPORTS, MOBILE_VIEWPORTS, type Device, type Platform, type Project, type ThemeMode } from '../types'
import { Button, Segmented, Select, NumberInput, Checkbox, TextInput, IconButton } from './ui'
import type { SimulationState } from '../stores/simulationStore'

type SimSlice = Pick<
  SimulationState,
  | 'platform'
  | 'device'
  | 'theme'
  | 'viewportPresetId'
  | 'viewportWidth'
  | 'viewportHeight'
  | 'mockCount'
  | 'useFixedSeed'
  | 'seed'
  | 'inspectEnabled'
  | 'candidateId'
>

export function ViewportPicker({
  device,
  presetId,
  width,
  height,
  onChange,
}: {
  device: Device
  presetId: string
  width: number
  height: number
  onChange: (v: { viewportPresetId: string; viewportWidth: number; viewportHeight: number }) => void
}) {
  const presets = device === 'desktop' ? DESKTOP_VIEWPORTS : MOBILE_VIEWPORTS
  const known = presets.some((p) => p.id === presetId)
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={known ? presetId : 'custom'}
        onChange={(e) => {
          const id = e.target.value
          if (id === 'custom') {
            onChange({ viewportPresetId: 'custom', viewportWidth: width, viewportHeight: height })
          } else {
            const p = presets.find((x) => x.id === id)!
            onChange({ viewportPresetId: p.id, viewportWidth: p.width, viewportHeight: p.height })
          }
        }}
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
        <option value="custom">自定义</option>
      </Select>
      {!known || presetId === 'custom' ? (
        <>
          <NumberInput value={width} onChange={(e) => onChange({ viewportPresetId: 'custom', viewportWidth: Number(e.target.value) || width, viewportHeight: height })} className="w-20" />
          <span className="text-xs text-zinc-500">×</span>
          <NumberInput value={height} onChange={(e) => onChange({ viewportPresetId: 'custom', viewportWidth: width, viewportHeight: Number(e.target.value) || height })} className="w-20" />
        </>
      ) : null}
    </div>
  )
}

export function MockCountPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const PRESETS = [6, 12, 20, 30]
  const [customMode, setCustomMode] = useState(!PRESETS.includes(value))
  const showCustom = customMode || !PRESETS.includes(value)
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={showCustom ? 'custom' : String(value)}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            setCustomMode(true)
            onChange(value > 0 ? value : 12)
          } else {
            setCustomMode(false)
            onChange(Number(e.target.value))
          }
        }}
      >
        {PRESETS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value="custom">自定义</option>
      </Select>
      {showCustom ? (
        <NumberInput
          min={1}
          max={60}
          value={value > 0 ? value : 12}
          onChange={(e) => onChange(Math.min(60, Math.max(1, Math.round(Number(e.target.value) || 12))))}
          className="w-16"
        />
      ) : null}
    </div>
  )
}

/**
 * Shared control bar for Preview / A/B pages. Pure controlled component —
 * all state lives in the simulation store.
 */
export function TestSetupBar({
  project,
  sim,
  patch,
  onShuffle,
  showCandidate = true,
  showInspect = true,
}: {
  project: Project
  sim: SimSlice
  patch: (p: Partial<SimulationState>) => void
  onShuffle: () => void
  showCandidate?: boolean
  showInspect?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#1e2027] bg-[#101218] px-4 py-2.5">
      <Segmented<Platform>
        value={sim.platform}
        onChange={(v) => patch({ platform: v })}
        options={[
          { value: 'youtube', label: 'YouTube' },
          { value: 'bilibili', label: 'Bilibili' },
        ]}
      />
      <Segmented<Device>
        value={sim.device}
        onChange={(v) => {
          // Viewport presets are per-device: when the current one doesn't belong
          // to the newly picked device, fall back to its default.
          const list = v === 'desktop' ? DESKTOP_VIEWPORTS : MOBILE_VIEWPORTS
          const next: Partial<SimulationState> = { device: v }
          if (!list.some((p) => p.id === sim.viewportPresetId)) {
            next.viewportPresetId = list[1].id
            next.viewportWidth = list[1].width
            next.viewportHeight = list[1].height
          }
          patch(next)
        }}
        options={[
          { value: 'desktop', label: '桌面端' },
          { value: 'mobile', label: '手机端' },
        ]}
      />
      <Segmented<ThemeMode>
        value={sim.theme}
        onChange={(v) => patch({ theme: v })}
        options={[
          { value: 'light', label: <Sun size={13} /> },
          { value: 'dark', label: <Moon size={13} /> },
        ]}
      />
      <ViewportPicker
        device={sim.device}
        presetId={sim.viewportPresetId}
        width={sim.viewportWidth}
        height={sim.viewportHeight}
        onChange={(v) => patch(v)}
      />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">干扰视频</span>
        <MockCountPicker value={sim.mockCount} onChange={(v) => patch({ mockCount: v })} />
      </div>
      {showCandidate ? (
        <Select value={sim.candidateId ?? ''} onChange={(e) => patch({ candidateId: e.target.value || null })}>
          <option value="">未选择 Candidate</option>
          {project.candidates.filter((c) => c.enabled).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      ) : null}
      <div className="flex items-center gap-1.5">
        <Checkbox label="固定 Seed" checked={sim.useFixedSeed} onChange={(v) => patch({ useFixedSeed: v })} />
        <TextInput value={sim.seed} onChange={(e) => patch({ seed: e.target.value })} className="w-36 font-mono text-xs" />
        <IconButton title="随机新 Seed" onClick={() => patch({ seed: Math.random().toString(36).slice(2, 10) + Date.now().toString(36) })}>
          <Dices size={15} />
        </IconButton>
        <IconButton title="Shuffle(生成新信息流)" onClick={onShuffle}>
          <Shuffle size={15} />
        </IconButton>
      </div>
      {showInspect ? (
        <Checkbox
          label={
            <span className="flex items-center gap-1">
              <Eye size={13} /> Inspect
            </span>
          }
          checked={sim.inspectEnabled}
          onChange={(v) => patch({ inspectEnabled: v })}
        />
      ) : null}
      {/* 打开对应官网做并排对照: Bilibili 手机版指向 m.bilibili.com */}
      <a
        href={
          sim.platform === 'youtube'
            ? 'https://www.youtube.com/'
            : sim.device === 'mobile'
              ? 'https://m.bilibili.com/'
              : 'https://www.bilibili.com/'
        }
        target="_blank"
        rel="noreferrer"
      >
        <Button size="sm" variant="subtle">
          <ExternalLink size={13} /> 官网对照
        </Button>
      </a>
    </div>
  )
}

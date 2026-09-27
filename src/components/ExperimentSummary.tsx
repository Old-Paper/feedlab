import { Database, FlaskConical, Layers, Lock, Monitor, Shuffle, Timer } from 'lucide-react'
import type { BlindDuration, CompetitionEnvironment, Device, Platform } from '../types'

export interface ExperimentSummaryProps {
  platform: Platform
  device: Device
  environment: CompetitionEnvironment
  environmentLabel: string
  candidateCount: number
  rounds: number
  blindDuration: BlindDuration
  lockEnvironment: boolean
  useFixedSeed: boolean
  seed?: string
  variant?: 'panel' | 'compact'
}

function platformLabel(p: Platform): string {
  return p === 'youtube' ? 'YouTube' : 'Bilibili'
}

function deviceLabel(d: Device): string {
  return d === 'desktop' ? '桌面' : '手机'
}

function durationLabel(d: BlindDuration): string {
  return d === 0 ? '不限时（手动结束）' : `每轮 ${d} 秒`
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#23252d] text-zinc-500">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-zinc-500">{label}</div>
        <div className="text-[13px] leading-snug text-zinc-200">{value}</div>
      </div>
    </div>
  )
}

/**
 * 实验配置摘要 —— 让创作者在开始测试前清楚:
 * 在什么环境、比较几个方案、跑多少轮、干扰视频是否公平。
 * 只用于完整项目模式, 不进入 Quick Mode。
 */
export function ExperimentSummary(props: ExperimentSummaryProps) {
  const perCandidate = Math.max(1, Math.ceil(props.rounds / Math.max(1, props.candidateCount)))
  const seedText = props.useFixedSeed ? `固定 Seed（${props.seed ?? ''}）` : '随机 Seed'

  if (props.variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        <span>
          实验环境:{platformLabel(props.platform)} · {deviceLabel(props.device)}
        </span>
        <span>竞争环境:{props.environmentLabel}</span>
        <span>
          {props.candidateCount} 个方案 · {props.rounds} 轮
        </span>
        <span>{props.lockEnvironment ? '已锁定竞争池' : '每轮随机环境'}</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#23252e] bg-[#12141a] p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-200">
        <FlaskConical size={14} className="text-indigo-300" /> 实验环境
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Row icon={<Monitor size={12} />} label="平台与设备" value={`${platformLabel(props.platform)} · ${deviceLabel(props.device)}`} />
        <Row icon={<Layers size={12} />} label="竞争环境" value={props.environmentLabel} />
        <Row
          icon={<Database size={12} />}
          label="方案与轮数"
          value={`${props.candidateCount} 个方案 · ${props.rounds} 轮（每方案约 n=${perCandidate}）`}
        />
        <Row icon={<Timer size={12} />} label="展示时间" value={durationLabel(props.blindDuration)} />
        <Row icon={<Shuffle size={12} />} label="位置" value="每个位置均衡轮换" />
        <Row
          icon={<Lock size={12} />}
          label="竞争池"
          value={
            props.lockEnvironment ? (
              <span>
                已锁定 —— 不同方案面对<span className="text-emerald-300/90">同一组干扰视频</span>, 比较更公平
              </span>
            ) : (
              '未锁定 —— 每轮随机抽取干扰视频'
            )
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#23252e] pt-2.5 text-[11px] text-zinc-500">
        <span>{seedText}</span>
        <span>模拟信息流实验结果, 用于比较不同包装方案的相对表现。</span>
      </div>
    </div>
  )
}

/** 竞争环境的展示文案 */
export function environmentLabel(
  env: CompetitionEnvironment,
  useRealPool: boolean,
  competitorCount: number,
): string {
  if (env === 'minecraft') return useRealPool ? 'Minecraft（真实池）' : 'Minecraft（内置库）'
  if (env === 'competitors') return `我的竞品库（${competitorCount} 条启用）`
  return useRealPool ? '全站（真实热门池）' : '全站（内置干扰库）'
}

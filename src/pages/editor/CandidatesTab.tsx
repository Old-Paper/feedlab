import { useMemo, useState } from 'react'
import { Copy, Grid3x3, Layers, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { Badge, Button, Checkbox, ConfirmModal, EmptyState, IconButton, Modal, NumberInput, SectionCard, Select, TextInput } from '../../components/ui'
import { uid } from '../../lib/id'
import { truncate } from '../../lib/format'
import type { Candidate, CandidateMetadataOverride } from '../../types'

function MetadataModal({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  if (!project) return null
  const ch = project.channel
  const base = project.testSettings.platform === 'youtube' ? ch.youtube : ch.bilibili

  const set = (key: keyof CandidateMetadataOverride, value: number | undefined) => {
    update((p) => {
      const c = p.candidates.find((x) => x.id === candidate.id)
      if (!c) return
      c.metadata = { ...c.metadata, [key]: value }
    })
  }

  const numOrEmpty = (v: number | undefined) => (v === undefined ? '' : String(v))
  const parse = (raw: string): number | undefined => (raw === '' ? undefined : Number(raw))

  return (
    <Modal
      open
      title={`单独元数据 · ${candidate.name}`}
      onClose={onClose}
      width={440}
      footer={<Button variant="primary" onClick={onClose}>完成</Button>}
    >
      <div className="space-y-3 text-[13px]">
        <p className="text-xs leading-relaxed text-zinc-500">
          留空 = 使用频道资料的固定值。这里设置的数值在「随机元数据」关闭时仍然生效,可以为某个组合单独指定播放量、时长等。
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">播放量(默认 {base.views})</span>
            <NumberInput value={numOrEmpty(candidate.metadata.views)} placeholder={String(base.views)} onChange={(e) => set('views', parse(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">时长(秒,默认 {base.durationSec})</span>
            <NumberInput value={numOrEmpty(candidate.metadata.durationSec)} placeholder={String(base.durationSec)} onChange={(e) => set('durationSec', parse(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">发布于几小时前(默认 {base.publishedHoursAgo})</span>
            <NumberInput value={numOrEmpty(candidate.metadata.publishedHoursAgo)} placeholder={String(base.publishedHoursAgo)} onChange={(e) => set('publishedHoursAgo', parse(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">弹幕数(默认 {base.danmaku})</span>
            <NumberInput value={numOrEmpty(candidate.metadata.danmaku)} placeholder={String(base.danmaku)} onChange={(e) => set('danmaku', parse(e.target.value))} />
          </label>
        </div>
      </div>
    </Modal>
  )
}

export function CandidatesTab() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  const [metaTarget, setMetaTarget] = useState<Candidate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [fixedThumb, setFixedThumb] = useState('')
  const [fixedTitle, setFixedTitle] = useState('')
  const [selThumbs, setSelThumbs] = useState<Set<string>>(new Set())
  const [selTitles, setSelTitles] = useState<Set<string>>(new Set())
  const [replace, setReplace] = useState(false)
  if (!project) return null

  const enabledCount = project.candidates.filter((c) => c.enabled).length

  const cartesianCount = useMemo(() => {
    let n = 0
    for (const t of project.thumbnails) if (selThumbs.has(t.id)) for (const ti of project.titles) if (selTitles.has(ti.id)) n += 1
    return n
  }, [project.thumbnails, project.titles, selThumbs, selTitles])

  const generateCartesian = () => {
    if (cartesianCount === 0) return
    update((p) => {
      const combos: Candidate[] = []
      let i = 1
      for (const t of p.thumbnails) {
        if (!selThumbs.has(t.id)) continue
        for (const ti of p.titles) {
          if (!selTitles.has(ti.id)) continue
          combos.push({
            id: uid(),
            name: `C${i} · ${truncate(t.name, 10)} × ${truncate(ti.text, 12)}`,
            thumbnailId: t.id,
            titleId: ti.id,
            enabled: true,
            createdAt: Date.now(),
            metadata: {},
          })
          i += 1
        }
      }
      p.candidates = replace ? combos : [...p.candidates, ...combos]
    })
    setSelThumbs(new Set())
    setSelTitles(new Set())
  }

  const addFixedPair = () => {
    if (!fixedThumb && !fixedTitle) return
    update((p) => {
      const t = p.thumbnails.find((x) => x.id === fixedThumb)
      const ti = p.titles.find((x) => x.id === fixedTitle)
      p.candidates.push({
        id: uid(),
        name: `组合${p.candidates.length + 1}${t ? ` · ${truncate(t.name, 10)}` : ''}${ti ? ` × ${truncate(ti.text, 12)}` : ''}`,
        thumbnailId: fixedThumb || null,
        titleId: fixedTitle || null,
        enabled: true,
        createdAt: Date.now(),
        metadata: {},
      })
    })
    setFixedThumb('')
    setFixedTitle('')
  }

  const toggleSel = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    apply(next)
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="固定搭配(Fixed Pair)"
        hint="手动指定封面 + 标题"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select value={fixedThumb} onChange={(e) => setFixedThumb(e.target.value)} className="max-w-52">
            <option value="">选择封面…</option>
            {project.thumbnails.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <span className="text-zinc-600">×</span>
          <Select value={fixedTitle} onChange={(e) => setFixedTitle(e.target.value)} className="max-w-64">
            <option value="">选择标题…</option>
            {project.titles.map((t) => (
              <option key={t.id} value={t.id}>
                {truncate(t.text, 36)}
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={addFixedPair} disabled={!fixedThumb && !fixedTitle}>
            添加组合
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="笛卡尔积生成(Cartesian Product)" hint="勾选多张封面 × 多条标题,一键生成全部组合">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-medium text-zinc-400">封面({selThumbs.size} 已选)</div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-[#23252e] p-2">
              {project.thumbnails.length === 0 ? <div className="py-2 text-center text-xs text-zinc-600">先上传封面</div> : null}
              {project.thumbnails.map((t) => (
                <Checkbox key={t.id} checked={selThumbs.has(t.id)} onChange={() => toggleSel(selThumbs, t.id, setSelThumbs)} label={truncate(t.name, 28)} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium text-zinc-400">标题({selTitles.size} 已选)</div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-[#23252e] p-2">
              {project.titles.length === 0 ? <div className="py-2 text-center text-xs text-zinc-600">先添加标题</div> : null}
              {project.titles.map((t) => (
                <Checkbox key={t.id} checked={selTitles.has(t.id)} onChange={() => toggleSel(selTitles, t.id, setSelTitles)} label={truncate(t.text, 32)} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Checkbox label="替换现有全部组合" checked={replace} onChange={setReplace} />
          <Button variant="primary" disabled={cartesianCount === 0} onClick={generateCartesian}>
            <Grid3x3 size={14} /> 生成 {cartesianCount} 个组合
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title={`Candidate 列表(${project.candidates.length},启用 ${enabledCount})`}
        right={<Badge tone={enabledCount > 0 ? 'success' : 'warn'}>{enabledCount > 0 ? '可开始测试' : '至少启用一个'}</Badge>}
      >
        {project.candidates.length === 0 ? (
          <EmptyState icon={<Layers size={28} />} title="还没有 Candidate" hint="Candidate 是一张封面 + 一条标题的最终参赛组合。用上方两种方式生成。" />
        ) : (
          <div className="space-y-1.5">
            {project.candidates.map((c) => {
              const missingThumb = c.thumbnailId ? !project.thumbnails.some((t) => t.id === c.thumbnailId) : true
              const missingTitle = c.titleId ? !project.titles.some((t) => t.id === c.titleId) : true
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-[#23252e] bg-[#14161c] px-2.5 py-2">
                  <Checkbox
                    checked={c.enabled}
                    onChange={(v) =>
                      update((p) => {
                        const x = p.candidates.find((y) => y.id === c.id)
                        if (x) x.enabled = v
                      })
                    }
                  />
                  <TextInput
                    value={c.name}
                    className="w-52"
                    onChange={(e) =>
                      update((p) => {
                        const x = p.candidates.find((y) => y.id === c.id)
                        if (x) x.name = e.target.value
                      })
                    }
                  />
                  <Select
                    value={c.thumbnailId ?? ''}
                    onChange={(e) =>
                      update((p) => {
                        const x = p.candidates.find((y) => y.id === c.id)
                        if (x) x.thumbnailId = e.target.value || null
                      })
                    }
                    className="max-w-44"
                  >
                    <option value="">{missingThumb ? '⚠ 选择封面…' : '选择封面…'}</option>
                    {project.thumbnails.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={c.titleId ?? ''}
                    onChange={(e) =>
                      update((p) => {
                        const x = p.candidates.find((y) => y.id === c.id)
                        if (x) x.titleId = e.target.value || null
                      })
                    }
                    className="max-w-56"
                  >
                    <option value="">{missingTitle ? '⚠ 选择标题…' : '选择标题…'}</option>
                    {project.titles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {truncate(t.text, 30)}
                      </option>
                    ))}
                  </Select>
                  <div className="ml-auto flex gap-0.5">
                    <IconButton title="单独元数据" onClick={() => setMetaTarget(c)}>
                      <SlidersHorizontal size={13} />
                    </IconButton>
                    <IconButton
                      title="复制组合"
                      onClick={() =>
                        update((p) => {
                          const src = p.candidates.find((y) => y.id === c.id)
                          if (src) p.candidates.push({ ...structuredClone(src), id: uid(), name: `${src.name} 副本`, createdAt: Date.now() })
                        })
                      }
                    >
                      <Copy size={13} />
                    </IconButton>
                    <IconButton title="删除" onClick={() => setDeleteTarget(c)}>
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {metaTarget ? <MetadataModal candidate={metaTarget} onClose={() => setMetaTarget(null)} /> : null}
      <ConfirmModal
        open={!!deleteTarget}
        title="删除组合"
        message={`删除「${deleteTarget?.name}」?其测试记录会保留,但之后不再参与测试。`}
        onConfirm={() =>
          update((p) => {
            p.candidates = p.candidates.filter((x) => x.id !== deleteTarget?.id)
          })
        }
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

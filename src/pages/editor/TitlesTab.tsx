import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Trash2, Type } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { Button, EmptyState, IconButton, SectionCard, TextArea, TextInput } from '../../components/ui'
import { uid } from '../../lib/id'
import type { TitleItem } from '../../types'

function TitleRow({ title, index, total }: { title: TitleItem; index: number; total: number }) {
  const update = useProjectStore((s) => s.updateProject)

  const move = (dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= total) return
    update((p) => {
      const arr = p.titles
      const a = arr.find((x) => x.id === title.id)
      const b = arr.find((x) => x.id === arr[target].id)
      if (a && b) {
        const tmp = a.order
        a.order = b.order
        b.order = tmp
        arr.sort((x, y) => x.order - y.order)
      }
    })
  }

  return (
    <div className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-[#23252e] hover:bg-[#14161c]">
      <span className="w-7 shrink-0 text-right text-xs tabular-nums text-zinc-600">{index + 1}</span>
      <input
        value={title.text}
        onChange={(e) =>
          update((p) => {
            const t = p.titles.find((x) => x.id === title.id)
            if (t) t.text = e.target.value
          })
        }
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-zinc-200 outline-none hover:border-[#2f323c] focus:border-indigo-500/70"
      />
      <span className="shrink-0 text-[11px] tabular-nums text-zinc-600">{title.text.length} 字</span>
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton title="上移" onClick={() => move(-1)} disabled={index === 0}>
          <ArrowUp size={13} />
        </IconButton>
        <IconButton title="下移" onClick={() => move(1)} disabled={index === total - 1}>
          <ArrowDown size={13} />
        </IconButton>
        <IconButton
          title="复制标题"
          onClick={() => void navigator.clipboard?.writeText(title.text).then(() => undefined).catch(() => undefined)}
        >
          <Copy size={13} />
        </IconButton>
        <IconButton
          title="删除"
          onClick={() =>
            update((p) => {
              p.titles = p.titles.filter((t) => t.id !== title.id)
              p.titles.forEach((t, i) => (t.order = i))
            })
          }
        >
          <Trash2 size={13} />
        </IconButton>
      </div>
    </div>
  )
}

export function TitlesTab() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.updateProject)
  const [single, setSingle] = useState('')
  const [batch, setBatch] = useState('')
  const [batchOpen, setBatchOpen] = useState(false)
  const singleRef = useRef<HTMLInputElement>(null)
  if (!project) return null

  const addSingle = () => {
    const text = single.trim()
    if (!text) return
    update((p) => {
      p.titles.push({ id: uid(), text, order: p.titles.length, createdAt: Date.now() })
    })
    setSingle('')
    singleRef.current?.focus()
  }

  const addBatch = () => {
    const lines = batch
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) return
    update((p) => {
      for (const line of lines) {
        p.titles.push({ id: uid(), text: line, order: p.titles.length, createdAt: Date.now() })
      }
    })
    setBatch('')
    setBatchOpen(false)
  }

  const sorted = [...project.titles].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      <SectionCard title="添加标题">
        <div className="flex gap-2">
          <TextInput
            ref={singleRef}
            className="flex-1"
            placeholder="输入一条标题后回车,如:我在全是岩浆的世界生存了100天"
            value={single}
            onChange={(e) => setSingle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSingle()}
          />
          <Button variant="primary" onClick={addSingle}>
            添加
          </Button>
          <Button variant={batchOpen ? 'default' : 'subtle'} onClick={() => setBatchOpen((v) => !v)}>
            批量输入
          </Button>
        </div>
        {batchOpen ? (
          <div className="mt-3">
            <TextArea
              rows={5}
              placeholder={'每行一个标题,系统自动拆分:\n我在全是岩浆的世界生存了100天\nMinecraft但是整个世界都是岩浆\n在岩浆海世界生存100天会发生什么?'}
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-zinc-600">一行 = 一个标题,空行自动忽略</span>
              <Button variant="primary" onClick={addBatch}>
                批量添加
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={`标题库(${project.titles.length})`}>
        {sorted.length === 0 ? (
          <EmptyState icon={<Type size={28} />} title="还没有标题" hint="单条添加或批量粘贴。标题与封面组合生成 Candidate 后才能测试。" />
        ) : (
          <div className="space-y-0.5">
            {sorted.map((t, i) => (
              <TitleRow key={t.id} title={t} index={i} total={sorted.length} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

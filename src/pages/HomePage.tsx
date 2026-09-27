import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Download, FolderOpen, FolderPlus, Pencil, Trash2, Upload } from 'lucide-react'
import { useProjectListStore } from '../stores/projectListStore'
import { projectRepository } from '../db/repositories/projectRepository'
import { Button, ConfirmModal, EmptyState, IconButton, Modal, TextInput } from '../components/ui'
import { formatDate } from '../lib/format'
import { exportProjectToFile, importProjectsFromFile } from '../features/io/projectIO'
import { toast } from '../stores/toastStore'
import { errorMessage } from '../lib/format'

export function HomePage() {
  const navigate = useNavigate()
  const projects = useProjectListStore((s) => s.projects)
  const loading = useProjectListStore((s) => s.loading)
  const loaded = useProjectListStore((s) => s.loaded)
  const load = useProjectListStore((s) => s.load)
  const create = useProjectListStore((s) => s.create)
  const duplicate = useProjectListStore((s) => s.duplicate)
  const remove = useProjectListStore((s) => s.remove)

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  const onImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const summary = await importProjectsFromFile(files[0])
      toast.success(`已导入项目:${summary.names.join('、')}`)
      await load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-100">测试项目</h1>
            <p className="mt-0.5 text-xs text-zinc-500">每个项目包含独立的封面、标题、Candidate 组合与测试数据</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void onImport(e.target.files)} />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> 导入项目
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                const id = await create()
                if (id) navigate(`/project/${id}/editor`)
              }}
            >
              <FolderPlus size={14} /> 新建项目
            </Button>
          </div>
        </header>

        {loading && !loaded ? (
          <div className="py-20 text-center text-sm text-zinc-500">加载中…</div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={36} />}
            title="还没有测试项目"
            hint="新建一个项目,上传几张封面、写几条标题、生成 Candidate,然后放进真实的 YouTube / Bilibili 信息流里做盲测。"
            action={
              <Button
                variant="primary"
                onClick={async () => {
                  const id = await create()
                  if (id) navigate(`/project/${id}/editor`)
                }}
              >
                新建项目
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group cursor-pointer rounded-lg border border-[#23252e] bg-[#12141a] p-4 transition-colors hover:border-indigo-500/50"
                onClick={() => navigate(`/project/${p.id}/editor`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-zinc-100">{p.name}</h3>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      title="重命名"
                      onClick={() => setRenameTarget({ id: p.id, name: p.name })}
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton title="复制项目" onClick={() => void duplicate(p.id)}>
                      <Copy size={14} />
                    </IconButton>
                    <IconButton
                      title="导出"
                      onClick={() => {
                        void exportProjectToFile(p.id)
                          .then((name) => toast.success(`已导出 ${name}`))
                          .catch((e) => toast.error(errorMessage(e)))
                      }}
                    >
                      <Download size={14} />
                    </IconButton>
                    <IconButton title="删除" onClick={() => setDeleteTarget({ id: p.id, name: p.name })}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-500">更新于 {formatDate(p.updatedAt)}</div>
                <div className="mt-3 flex gap-4 text-xs text-zinc-400">
                  <span>{p.thumbnailCount} 封面</span>
                  <span>{p.titleCount} 标题</span>
                  <span>{p.candidateCount} 组合</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!renameTarget}
        title="重命名项目"
        onClose={() => setRenameTarget(null)}
        width={380}
        footer={
          <>
            <Button onClick={() => setRenameTarget(null)}>取消</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (renameTarget) void renameProject(renameTarget.id, renameTarget.name)
                setRenameTarget(null)
              }}
            >
              保存
            </Button>
          </>
        }
      >
        <TextInput
          className="w-full"
          value={renameTarget?.name ?? ''}
          autoFocus
          onChange={(e) => setRenameTarget((t) => (t ? { ...t, name: e.target.value } : t))}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="删除项目"
        message={`确定删除「${deleteTarget?.name}」?项目的封面、Candidate 与全部测试记录都会被移除,无法恢复。`}
        onConfirm={() => deleteTarget && void remove(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )

  async function renameProject(id: string, name: string) {
    const p = await projectRepository.get(id)
    if (!p) return
    await projectRepository.put({ ...p, name: name.trim() || p.name, updatedAt: Date.now() })
    await load()
  }
}

import type { MockVideo, Project, StoredAsset } from '../../types'
import { projectRepository, assetRepository } from '../../db/repositories/projectRepository'
import { db } from '../../db/database'
import { uid } from '../../lib/id'

export interface ExportedAsset {
  id: string
  kind: StoredAsset['kind']
  mime: string
  name: string
  width: number
  height: number
  data: string // data URL
}

export interface ProjectExport {
  format: 'feedlab.project'
  version: 1
  exportedAt: string
  project: Project
  assets: ExportedAsset[]
}

export interface AllProjectsExport {
  format: 'feedlab.all'
  version: 1
  exportedAt: string
  projects: ProjectExport[]
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取图片数据失败'))
    reader.readAsDataURL(blob)
  })
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'project'
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exportProjectToFile(projectId: string): Promise<string> {
  const project = await projectRepository.get(projectId)
  if (!project) throw new Error('项目不存在')
  const assets = await assetRepository.listByProject(projectId)
  const exported: ProjectExport = {
    format: 'feedlab.project',
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    assets: await Promise.all(
      assets.map(async (a) => ({
        id: a.id,
        kind: a.kind,
        mime: a.mime,
        name: a.name,
        width: a.width,
        height: a.height,
        data: await blobToDataURL(a.blob),
      })),
    ),
  }
  const filename = `${sanitizeFilename(project.name)}.project.json`
  downloadJSON(exported, filename)
  return filename
}

export async function exportAllProjects(): Promise<string> {
  const projects = await projectRepository.list()
  const exports: ProjectExport[] = []
  for (const p of projects) {
    const assets = await assetRepository.listByProject(p.id)
    exports.push({
      format: 'feedlab.project',
      version: 1,
      exportedAt: new Date().toISOString(),
      project: p,
      assets: await Promise.all(
        assets.map(async (a) => ({
          id: a.id,
          kind: a.kind,
          mime: a.mime,
          name: a.name,
          width: a.width,
          height: a.height,
          data: await blobToDataURL(a.blob),
        })),
      ),
    })
  }
  const payload: AllProjectsExport = {
    format: 'feedlab.all',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: exports,
  }
  const filename = `feedlab-all-${new Date().toISOString().slice(0, 10)}.json`
  downloadJSON(payload, filename)
  return filename
}

function isProjectExport(data: unknown): data is ProjectExport {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as ProjectExport).format === 'feedlab.project' &&
    typeof (data as ProjectExport).project === 'object'
  )
}

function isAllExport(data: unknown): data is AllProjectsExport {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as AllProjectsExport).format === 'feedlab.all' &&
    Array.isArray((data as AllProjectsExport).projects)
  )
}

async function dataURLToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  if (!res.ok) throw new Error('资源数据无效')
  return await res.blob()
}

async function importOne(exp: ProjectExport): Promise<Project> {
  const project: Project = structuredClone(exp.project)
  project.id = uid()
  project.updatedAt = Date.now()

  // New ids for every asset so repeated imports never collide or cross-link.
  const idMap = new Map<string, string>()
  await dbWrite(project, exp, idMap)
  return project
}

async function dbWrite(project: Project, exp: ProjectExport, idMap: Map<string, string>): Promise<void> {
  for (const ea of exp.assets) {
    if (typeof ea.data !== 'string' || !ea.data.startsWith('data:')) continue
    const newId = uid()
    idMap.set(ea.id, newId)
    let blob: Blob
    try {
      blob = await dataURLToBlob(ea.data)
    } catch {
      continue // 跳过损坏的图片资源,项目本身仍可导入
    }
    await db.assets.put({
      id: newId,
      projectId: project.id,
      kind: ea.kind,
      mime: ea.mime || blob.type || 'image/png',
      name: ea.name ?? 'asset',
      width: ea.width ?? 0,
      height: ea.height ?? 0,
      size: blob.size,
      createdAt: Date.now(),
      blob,
    })
  }
  remapAssetRefs(project, idMap)
  await db.projects.put(project)
}

function remapAssetRefs(project: Project, map: Map<string, string>): void {
  for (const t of project.thumbnails) {
    t.assetId = map.get(t.assetId) ?? t.assetId
  }
  if (project.channel.avatarAssetId) {
    project.channel.avatarAssetId = map.get(project.channel.avatarAssetId) ?? project.channel.avatarAssetId
  }
  for (const m of project.mockVideos) {
    if (m.thumbAssetId) m.thumbAssetId = map.get(m.thumbAssetId) ?? m.thumbAssetId
  }
}

export interface ImportSummary {
  names: string[]
}

/** Imports a .project.json (single project) or an all-projects export. */
export async function importProjectsFromFile(file: File): Promise<ImportSummary> {
  const text = await file.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败:文件不是有效的项目文件')
  }

  if (isProjectExport(data)) {
    validateProject(data.project)
    const p = await importOne(data)
    return { names: [p.name] }
  }
  if (isAllExport(data)) {
    const names: string[] = []
    for (const exp of data.projects) {
      if (!isProjectExport(exp)) continue
      validateProject(exp.project)
      const p = await importOne(exp)
      names.push(p.name)
    }
    if (names.length === 0) throw new Error('文件中没有可导入的项目')
    return { names }
  }
  throw new Error('无法识别的文件格式:缺少 feedlab.project 标识')
}

function validateProject(p: Project): void {
  if (typeof p !== 'object' || p === null) throw new Error('项目数据无效')
  if (!Array.isArray(p.thumbnails) || !Array.isArray(p.titles) || !Array.isArray(p.candidates)) {
    throw new Error('项目数据不完整:缺少 thumbnails / titles / candidates')
  }
  if (!p.channel || !p.testSettings) throw new Error('项目数据不完整:缺少频道或测试设置')
  // Defensive defaults for older/partial files.
  p.mockVideos = (p.mockVideos ?? []).map((m: MockVideo) => ({ ...m, custom: true, enabled: m.enabled !== false }))
  p.disabledBuiltinMockIds = p.disabledBuiltinMockIds ?? []
}

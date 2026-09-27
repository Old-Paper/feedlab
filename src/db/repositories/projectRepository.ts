import type { Project, StoredAsset } from '../../types'
import { db } from '../database'
import { uid } from '../../lib/id'

export const projectRepository = {
  async list(): Promise<Project[]> {
    return await db.projects.orderBy('updatedAt').reverse().toArray()
  },

  async get(id: string): Promise<Project | undefined> {
    return await db.projects.get(id)
  },

  async put(project: Project): Promise<void> {
    await db.projects.put(project)
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.projects, db.assets, db.testSessions, async () => {
      await db.projects.delete(id)
      await db.assets.where('projectId').equals(id).delete()
      await db.testSessions.where('projectId').equals(id).delete()
    })
  },

  /**
   * Full deep copy: new project id, and every asset blob is duplicated so the
   * copy stays independent from the original (deleting one never breaks the other).
   */
  async duplicate(id: string): Promise<Project | undefined> {
    const source = await db.projects.get(id)
    if (!source) return undefined
    const copy: Project = structuredClone(source)
    copy.id = uid()
    copy.name = `${source.name} (副本)`
    copy.createdAt = Date.now()
    copy.updatedAt = Date.now()

    const assetMap = new Map<string, string>()
    const assets = await db.assets.where('projectId').equals(id).toArray()
    await db.transaction('rw', db.projects, db.assets, async () => {
      for (const asset of assets) {
        const newId = uid()
        assetMap.set(asset.id, newId)
        await db.assets.put({ ...asset, id: newId, projectId: copy.id })
      }
      for (const t of copy.thumbnails) {
        t.assetId = assetMap.get(t.assetId) ?? t.assetId
      }
      if (copy.channel.avatarAssetId) {
        copy.channel.avatarAssetId = assetMap.get(copy.channel.avatarAssetId) ?? copy.channel.avatarAssetId
      }
      for (const m of copy.mockVideos) {
        if (m.thumbAssetId) m.thumbAssetId = assetMap.get(m.thumbAssetId) ?? m.thumbAssetId
      }
      await db.projects.put(copy)
    })
    return copy
  },
}

export const assetRepository = {
  async put(asset: StoredAsset): Promise<void> {
    await db.assets.put(asset)
  },

  async get(id: string): Promise<StoredAsset | undefined> {
    return await db.assets.get(id)
  },

  async getBlob(id: string): Promise<Blob> {
    const asset = await db.assets.get(id)
    if (!asset) throw new Error(`资源不存在: ${id}`)
    return asset.blob
  },

  async listByProject(projectId: string): Promise<StoredAsset[]> {
    return await db.assets.where('projectId').equals(projectId).toArray()
  },

  async delete(id: string): Promise<void> {
    await db.assets.delete(id)
  },

  async deleteOrphan(id: string, project: Project): Promise<void> {
    const referenced =
      project.thumbnails.some((t) => t.assetId === id) ||
      project.channel.avatarAssetId === id ||
      project.mockVideos.some((m) => m.thumbAssetId === id)
    if (!referenced) await db.assets.delete(id)
  },

  async deleteByProject(projectId: string): Promise<void> {
    await db.assets.where('projectId').equals(projectId).delete()
  },
}

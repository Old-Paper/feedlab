import Dexie, { type Table } from 'dexie'
import type { Project, StoredAsset, TestSession } from '../types'

export class FeedLabDatabase extends Dexie {
  projects!: Table<Project, string>
  assets!: Table<StoredAsset, string>
  testSessions!: Table<TestSession, string>
  settings!: Table<{ key: string; value: unknown }, string>

  constructor() {
    super('feedlab-db')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      assets: 'id, projectId, kind, [projectId+kind]',
      testSessions: 'id, projectId, candidateId, mode, finishedAt, [projectId+finishedAt]',
      settings: 'key',
    })
  }
}

export const db = new FeedLabDatabase()

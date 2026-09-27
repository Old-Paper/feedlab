import type { TestSession } from '../../types'
import { db } from '../database'

export const sessionRepository = {
  async add(session: TestSession): Promise<void> {
    await db.testSessions.put(session)
  },

  async addMany(sessions: TestSession[]): Promise<void> {
    if (sessions.length > 0) await db.testSessions.bulkPut(sessions)
  },

  async listByProject(projectId: string): Promise<TestSession[]> {
    const all = await db.testSessions.where('projectId').equals(projectId).toArray()
    return all.sort((a, b) => b.finishedAt - a.finishedAt)
  },

  async deleteByProject(projectId: string): Promise<void> {
    await db.testSessions.where('projectId').equals(projectId).delete()
  },

  async deleteByIds(ids: string[]): Promise<void> {
    await db.testSessions.bulkDelete(ids)
  },
}

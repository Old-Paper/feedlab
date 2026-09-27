import { useEffect, useState } from 'react'
import { assetRepository } from '../db/repositories/projectRepository'

// Session-scoped object URL cache. Blobs are held for the lifetime of the tab;
// a tool like this loads a bounded number of assets, so no revocation bookkeeping.
const urlCache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

export async function getAssetUrl(assetId: string): Promise<string | null> {
  const cached = urlCache.get(assetId)
  if (cached) return cached
  let p = inflight.get(assetId)
  if (!p) {
    p = assetRepository
      .getBlob(assetId)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        urlCache.set(assetId, url)
        return url
      })
      .catch(() => null)
      .finally(() => inflight.delete(assetId))
    inflight.set(assetId, p)
  }
  return await p
}

/** Resolves an IndexedDB asset blob into an object URL for <img> rendering. */
export function useAssetUrl(assetId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (assetId ? urlCache.get(assetId) ?? null : null))

  useEffect(() => {
    if (!assetId) {
      setUrl(null)
      return
    }
    const cached = urlCache.get(assetId)
    if (cached) {
      setUrl(cached)
      return
    }
    let alive = true
    void getAssetUrl(assetId).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [assetId])

  return url
}

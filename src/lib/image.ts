import type { AssetKind, StoredAsset } from '../types'
import { uid } from './id'

export const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024

export function stripExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

export async function loadImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob)
      const size = { width: bmp.width, height: bmp.height }
      bmp.close()
      return size
    } catch {
      // fall through to <img> decoding
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片文件损坏或无法解码'))
    }
    img.src = url
  })
}

/** Validates type + decodability and returns the natural size. Throws with a readable message. */
export async function validateImageFile(file: File): Promise<{ width: number; height: number }> {
  if (!(IMAGE_MIMES as readonly string[]).includes(file.type)) {
    throw new Error(`不支持的图片格式:${file.type || '未知'}(仅支持 PNG / JPG / WEBP)`)
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`图片超过 20MB 限制(${(file.size / 1024 / 1024).toFixed(1)}MB)`)
  }
  return await loadImageSize(file)
}

export async function buildStoredAsset(
  file: File,
  kind: AssetKind,
  projectId: string,
): Promise<StoredAsset> {
  const { width, height } = await validateImageFile(file)
  return {
    id: uid(),
    projectId,
    kind,
    mime: file.type,
    name: file.name,
    width,
    height,
    size: file.size,
    createdAt: Date.now(),
    blob: file,
  }
}

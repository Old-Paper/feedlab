export function uid(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID().replace(/-/g, '').slice(0, 20)
  }
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e12).toString(36)}`
}

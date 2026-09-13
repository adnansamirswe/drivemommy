import type { Context, Next } from 'hono'
import { prisma } from '../config/db.js'
import { hashToken } from '../lib/crypto.js'
import { verifyAccessToken } from '../lib/jwt.js'

export type AppUser = { id: string; sessionId: string }

export function getUser(c: Context): AppUser | null {
  return (c as Context & { get: (k: string) => AppUser }).get?.('user') ?? (c.get as (k: string) => AppUser | undefined)('user') ?? null
}

function normalizeScopes(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** JWT bearer auth for dashboard */
export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) return c.json({ code: 'AUTH_REQUIRED', message: 'Bearer token required.' }, 401)
  try {
    const payload = verifyAccessToken(header.slice(7).trim())
    const session = await prisma.userSession.findUnique({ where: { id: payload.sid } })
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.userId !== payload.sub) {
      return c.json({ code: 'AUTH_SESSION_EXPIRED', message: 'Session expired.' }, 401)
    }
    c.set('user', { id: payload.sub, sessionId: payload.sid })
    await next()
  } catch {
    return c.json({ code: 'AUTH_INVALID', message: 'Invalid token.' }, 401)
  }
}

/** API-key auth with scope check for /api/v1/* */
export function requireApiKey(scope: string) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('Authorization')
    if (!header?.startsWith('Bearer ')) return c.json({ code: 'API_KEY_REQUIRED', message: 'API key required.' }, 401)
    const raw = header.slice(7).trim()
    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashToken(raw) } })
    if (!apiKey || apiKey.status !== 'active' || apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt <= new Date())) {
      return c.json({ code: 'API_KEY_INVALID', message: 'Invalid API key.' }, 401)
    }
    if (!normalizeScopes(apiKey.scopes).includes(scope)) {
      return c.json({ code: 'API_KEY_FORBIDDEN', message: 'API key missing required scope.' }, 403)
    }
    c.set('user', { id: apiKey.userId, sessionId: `api-key:${apiKey.id}` })
    c.set('apiKeyId', apiKey.id)
    await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined)
    await next()
  }
}

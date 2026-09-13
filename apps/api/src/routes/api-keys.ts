import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { hashToken, randomToken } from '../lib/crypto.js'
import { requireAuth } from '../middleware/auth.js'

export const SCOPES = ['files:read', 'files:upload', 'files:download', 'files:delete', 'storage:read', 'accounts:read'] as const

export const apiKeyRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

apiKeyRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const keys = await prisma.apiKey.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return c.json({ apiKeys: keys.map(({ keyHash: _h, ...k }) => k) })
})

apiKeyRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const body = z.object({ name: z.string().min(1).max(191), scopes: z.array(z.enum(SCOPES)).min(1), expiresAt: z.string().datetime().nullable().optional() }).parse(await c.req.json())
  const secret = `dm_live_${randomToken(32)}`
  const created = await prisma.apiKey.create({
    data: {
      userId: user.id, name: body.name, keyPrefix: secret.slice(0, 16),
      keyHash: hashToken(secret), scopes: body.scopes,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  })
  const { keyHash: _h, ...safe } = created
  return c.json({ apiKey: safe, secret }, 201)
})

apiKeyRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  await prisma.apiKey.updateMany({ where: { id: c.req.param('id'), userId: user.id }, data: { status: 'revoked', revokedAt: new Date() } })
  return c.json({ status: 'ok' })
})

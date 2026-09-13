import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { encryptText } from '../lib/crypto.js'
import { requireAuth } from '../middleware/auth.js'
import { GOOGLE_SCOPES } from '../modules/google.js'

export const providerConfigRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

/** Whether global Google OAuth is configured (no secrets leaked) */
providerConfigRoutes.get('/', requireAuth, async (c) => {
  const config = await prisma.providerConfig.findFirst({
    where: { userId: null, provider: 'google_drive', status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  return c.json({
    google: config
      ? { configured: true, redirectUri: config.redirectUri, updatedAt: config.updatedAt }
      : { configured: false, redirectUri: null, updatedAt: null },
  })
})

/** Save global Google OAuth credentials from Settings UI (encrypted at rest) */
providerConfigRoutes.post('/google', requireAuth, async (c) => {
  const body = z
    .object({
      clientId: z.string().min(1).max(500),
      clientSecret: z.string().min(1).max(500),
      redirectUri: z.string().url(),
    })
    .parse(await c.req.json())
  const existing = await prisma.providerConfig.findFirst({
    where: { userId: null, provider: 'google_drive', status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  const data = {
    clientIdEncrypted: encryptText(body.clientId),
    clientSecretEncrypted: encryptText(body.clientSecret),
    redirectUri: body.redirectUri,
    scopes: GOOGLE_SCOPES,
    status: 'active',
  }
  if (existing) {
    await prisma.providerConfig.update({ where: { id: existing.id }, data })
  } else {
    await prisma.providerConfig.create({ data: { userId: null, provider: 'google_drive', ...data } })
  }
  return c.json({ status: 'ok' })
})

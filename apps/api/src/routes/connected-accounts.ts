import { Hono } from 'hono'
import { google } from 'googleapis'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { env } from '../config/env.js'
import { encryptText, hashToken, randomToken } from '../lib/crypto.js'
import { hashPassword } from '../lib/password.js'
import { requireAuth } from '../middleware/auth.js'
import { createOAuthClient, syncGoogleQuota } from '../modules/google.js'

export const connectedAccountRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

async function buildConnectUrl(userId: string) {
  const config = await prisma.providerConfig.findFirst({
    where: { userId: null, provider: 'google_drive', status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  if (!config) throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: Save Google OAuth credentials in Settings first.')
  const state = randomToken()
  await prisma.oauthState.create({
    data: { userId, providerConfigId: config.id, flow: 'connect', stateHash: hashToken(state), expiresAt: new Date(Date.now() + 600_000) },
  })
  const client = createOAuthClient(config)
  return client.generateAuthUrl({
    access_type: 'offline', prompt: 'consent', include_granted_scopes: true, scope: config.scopes as string[], state,
  })
}

function serialize(account: Record<string, unknown> & { storageAccount?: Record<string, unknown> | null }) {
  const { accessTokenEncrypted: _a, refreshTokenEncrypted: _r, storageAccount, ...rest } = account
  return {
    ...rest,
    storageAccount: storageAccount
      ? {
          ...storageAccount,
          totalBytes: (storageAccount.totalBytes as bigint | null)?.toString() ?? null,
          usedBytes: (storageAccount.usedBytes as bigint).toString(),
          availableBytes: (storageAccount.availableBytes as bigint | null)?.toString() ?? null,
          trashBytes: (storageAccount.trashBytes as bigint | null)?.toString() ?? null,
        }
      : null,
  }
}

connectedAccountRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId: user.id, status: 'connected' },
    include: { storageAccount: true },
    orderBy: { createdAt: 'desc' },
  })
  for (const a of accounts.filter((x) => !x.storageAccount?.lastSyncedAt)) {
    await syncGoogleQuota(a.id).catch(() => undefined)
  }
  const fresh = await prisma.connectedAccount.findMany({
    where: { userId: user.id, status: 'connected' },
    include: { storageAccount: true },
    orderBy: { createdAt: 'desc' },
  })
  return c.json({ accounts: fresh.map(serialize) })
})

connectedAccountRoutes.get('/google/connect-url', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  return c.json({ url: await buildConnectUrl(user.id) })
})

connectedAccountRoutes.get('/google/connect', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  return c.redirect(await buildConnectUrl(user.id))
})

// Shared callback: handles both login + connect flows via OauthState.flow
connectedAccountRoutes.get('/google/callback', async (c) => {
  const params = Object.fromEntries(new URL(c.req.url).searchParams)
  const parsed = z.object({ code: z.string(), state: z.string() }).safeParse(params)
  if (!parsed.success) return c.redirect(`${env.FRONTEND_URL}/google-connected?status=error`)
  const { code, state } = parsed.data
  const oauthState = await prisma.oauthState.findUnique({ where: { stateHash: hashToken(state) }, include: { providerConfig: true } })
  if (!oauthState || oauthState.usedAt || oauthState.expiresAt < new Date()) {
    return c.redirect(`${env.FRONTEND_URL}/google-connected?status=error`)
  }
  const client = createOAuthClient(oauthState.providerConfig)
  const { tokens } = await client.getToken(code).catch(() => ({ tokens: {} as Record<string, unknown> }))
  const accessToken = (tokens as { access_token?: string }).access_token
  if (!accessToken) return c.redirect(`${env.FRONTEND_URL}/google-connected?status=error`)
  client.setCredentials(tokens as Parameters<typeof client.setCredentials>[0])
  const profile = await google.oauth2({ version: 'v2', auth: client }).userinfo.get()
  const providerAccountId = profile.data.id
  const email = profile.data.email
  if (!providerAccountId || !email) return c.redirect(`${env.FRONTEND_URL}/google-connected?status=error`)

  if (oauthState.flow === 'login') {
    const name = profile.data.name || email.split('@')[0] || 'Google User'
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name, passwordHash: await hashPassword(randomToken(32)) },
      update: { name },
    })
    const existing = await prisma.connectedAccount.findUnique({
      where: { userId_provider_providerAccountId: { userId: user.id, provider: 'google_drive', providerAccountId } },
    })
    const refreshEncrypted = (tokens as { refresh_token?: string }).refresh_token
      ? encryptText((tokens as { refresh_token: string }).refresh_token)
      : existing?.refreshTokenEncrypted
    if (!refreshEncrypted) return c.redirect(`${env.FRONTEND_URL}/google-auth?status=error`)
    const account = await prisma.connectedAccount.upsert({
      where: { userId_provider_providerAccountId: { userId: user.id, provider: 'google_drive', providerAccountId } },
      create: {
        userId: user.id, providerConfigId: oauthState.providerConfigId, provider: 'google_drive',
        providerAccountId, email, displayName: profile.data.name, avatarUrl: profile.data.picture,
        accessTokenEncrypted: encryptText(accessToken), refreshTokenEncrypted: refreshEncrypted,
        tokenExpiresAt: new Date((tokens as { expiry_date?: number }).expiry_date ?? Date.now() + 3_600_000),
        scopes: oauthState.providerConfig.scopes as string[], status: 'connected',
      },
      update: {
        email, displayName: profile.data.name, avatarUrl: profile.data.picture,
        accessTokenEncrypted: encryptText(accessToken), refreshTokenEncrypted: refreshEncrypted,
        tokenExpiresAt: new Date((tokens as { expiry_date?: number }).expiry_date ?? Date.now() + 3_600_000),
        status: 'connected',
      },
    })
    await prisma.oauthState.update({ where: { id: oauthState.id }, data: { usedAt: new Date(), userId: user.id } })
    await syncGoogleQuota(account.id).catch(() => undefined)
    const handoff = randomToken()
    await prisma.authHandoff.create({ data: { userId: user.id, tokenHash: hashToken(handoff), expiresAt: new Date(Date.now() + 300_000) } })
    return c.redirect(`${env.FRONTEND_URL}/google-auth?token=${handoff}`)
  }

  if (!oauthState.userId) return c.redirect(`${env.FRONTEND_URL}/google-connected?status=error`)
  const existing = await prisma.connectedAccount.findUnique({
    where: { userId_provider_providerAccountId: { userId: oauthState.userId, provider: 'google_drive', providerAccountId } },
  })
  const refreshEncrypted = (tokens as { refresh_token?: string }).refresh_token
    ? encryptText((tokens as { refresh_token: string }).refresh_token)
    : existing?.refreshTokenEncrypted
  if (!refreshEncrypted) return c.redirect(`${env.FRONTEND_URL}/google-connected?status=error`)
  const account = await prisma.connectedAccount.upsert({
    where: { userId_provider_providerAccountId: { userId: oauthState.userId, provider: 'google_drive', providerAccountId } },
    create: {
      userId: oauthState.userId, providerConfigId: oauthState.providerConfigId, provider: 'google_drive',
      providerAccountId, email, displayName: profile.data.name, avatarUrl: profile.data.picture,
      accessTokenEncrypted: encryptText(accessToken), refreshTokenEncrypted: refreshEncrypted,
      tokenExpiresAt: new Date((tokens as { expiry_date?: number }).expiry_date ?? Date.now() + 3_600_000),
      scopes: oauthState.providerConfig.scopes as string[], status: 'connected',
    },
    update: {
      email, displayName: profile.data.name, avatarUrl: profile.data.picture,
      accessTokenEncrypted: encryptText(accessToken), refreshTokenEncrypted: refreshEncrypted,
      tokenExpiresAt: new Date((tokens as { expiry_date?: number }).expiry_date ?? Date.now() + 3_600_000),
      status: 'connected',
    },
  })
  await prisma.oauthState.update({ where: { id: oauthState.id }, data: { usedAt: new Date() } })
  await syncGoogleQuota(account.id).catch(() => undefined)
  return c.redirect(`${env.FRONTEND_URL}/google-connected?status=success`)
})

connectedAccountRoutes.post('/:id/sync-quota', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const account = await prisma.connectedAccount.findFirstOrThrow({ where: { id: c.req.param('id'), userId: user.id } })
  const quota = await syncGoogleQuota(account.id)
  return c.json({
    quota: {
      ...quota,
      totalBytes: quota.totalBytes?.toString() ?? null,
      usedBytes: quota.usedBytes.toString(),
      availableBytes: quota.availableBytes?.toString() ?? null,
      trashBytes: quota.trashBytes?.toString() ?? null,
    },
  })
})

connectedAccountRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  await prisma.connectedAccount.updateMany({ where: { id: c.req.param('id'), userId: user.id }, data: { status: 'disconnected' } })
  return c.json({ status: 'ok' })
})

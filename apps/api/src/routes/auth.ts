import { Hono } from 'hono'
import { google } from 'googleapis'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { env } from '../config/env.js'
import { encryptText, hashToken, randomToken } from '../lib/crypto.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { signAccessToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import { createOAuthClient, syncGoogleQuota } from '../modules/google.js'

export const authRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) })
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

async function createSession(userId: string, userAgent?: string, ip?: string) {
  const refreshToken = randomToken()
  const session = await prisma.userSession.create({
    data: {
      userId,
      refreshTokenHash: hashToken(refreshToken),
      userAgent,
      ipAddress: ip,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  })
  return { accessToken: signAccessToken({ sub: userId, sid: session.id }), refreshToken }
}

authRoutes.post('/register', async (c) => {
  const body = registerSchema.parse(await c.req.json())
  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) return c.json({ code: 'AUTH_EMAIL_TAKEN', message: 'Email already registered.' }, 409)
  const user = await prisma.user.create({ data: { name: body.name, email: body.email, passwordHash: await hashPassword(body.password) } })
  const tokens = await createSession(user.id, c.req.header('User-Agent'))
  return c.json({ ...tokens, user: { id: user.id, name: user.name, email: user.email } }, 201)
})

authRoutes.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json())
  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
    return c.json({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password.' }, 401)
  }
  const tokens = await createSession(user.id, c.req.header('User-Agent'))
  return c.json({ ...tokens, user: { id: user.id, name: user.name, email: user.email } })
})

authRoutes.get('/google/url', async (c) => {
  const config = await prisma.providerConfig.findFirst({
    where: { userId: null, provider: 'google_drive', status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  if (!config) return c.json({ code: 'GOOGLE_OAUTH_NOT_CONFIGURED', message: 'Save Google OAuth credentials in Settings first.' }, 400)
  const state = randomToken()
  await prisma.oauthState.create({
    data: { providerConfigId: config.id, flow: 'login', stateHash: hashToken(state), expiresAt: new Date(Date.now() + 600_000) },
  })
  const client = createOAuthClient(config)
  const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', include_granted_scopes: true, scope: config.scopes as string[], state })
  return c.json({ url })
})

authRoutes.get('/google/callback', async (c) => {
  const query = z.object({ code: z.string(), state: z.string() }).parse(Object.fromEntries(new URL(c.req.url).searchParams))
  const oauthState = await prisma.oauthState.findUniqueOrThrow({ where: { stateHash: hashToken(query.state) }, include: { providerConfig: true } })
  if (oauthState.flow !== 'login' || oauthState.usedAt || oauthState.expiresAt < new Date()) {
    return c.redirect(`${env.FRONTEND_URL}/google-auth?status=error`)
  }
  const client = createOAuthClient(oauthState.providerConfig)
  const { tokens } = await client.getToken(query.code)
  if (!tokens.access_token) return c.redirect(`${env.FRONTEND_URL}/google-auth?status=error`)
  client.setCredentials(tokens)
  const profile = await google.oauth2({ version: 'v2', auth: client }).userinfo.get()
  const providerAccountId = profile.data.id
  const email = profile.data.email
  if (!providerAccountId || !email) return c.redirect(`${env.FRONTEND_URL}/google-auth?status=error`)
  const name = profile.data.name || email.split('@')[0] || 'Google User'
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash: await hashPassword(randomToken(32)) },
    update: { name },
  })
  const existingAccount = await prisma.connectedAccount.findUnique({
    where: { userId_provider_providerAccountId: { userId: user.id, provider: 'google_drive', providerAccountId } },
  })
  const refreshTokenEncrypted = tokens.refresh_token ? encryptText(tokens.refresh_token) : existingAccount?.refreshTokenEncrypted
  if (!refreshTokenEncrypted) return c.redirect(`${env.FRONTEND_URL}/google-auth?status=error`)
  const account = await prisma.connectedAccount.upsert({
    where: { userId_provider_providerAccountId: { userId: user.id, provider: 'google_drive', providerAccountId } },
    create: {
      userId: user.id, providerConfigId: oauthState.providerConfigId, provider: 'google_drive',
      providerAccountId, email, displayName: profile.data.name, avatarUrl: profile.data.picture,
      accessTokenEncrypted: encryptText(tokens.access_token), refreshTokenEncrypted,
      tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
      scopes: oauthState.providerConfig.scopes as string[], status: 'connected',
    },
    update: {
      providerConfigId: oauthState.providerConfigId, email, displayName: profile.data.name, avatarUrl: profile.data.picture,
      accessTokenEncrypted: encryptText(tokens.access_token), refreshTokenEncrypted,
      tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
      scopes: oauthState.providerConfig.scopes as string[], status: 'connected',
    },
  })
  await prisma.oauthState.update({ where: { id: oauthState.id }, data: { usedAt: new Date(), userId: user.id } })
  await syncGoogleQuota(account.id).catch(() => undefined)
  const handoffToken = randomToken()
  await prisma.authHandoff.create({ data: { userId: user.id, tokenHash: hashToken(handoffToken), expiresAt: new Date(Date.now() + 300_000) } })
  return c.redirect(`${env.FRONTEND_URL}/google-auth?token=${handoffToken}`)
})

authRoutes.post('/google/exchange', async (c) => {
  const body = z.object({ token: z.string().min(1) }).parse(await c.req.json())
  const handoff = await prisma.authHandoff.findFirst({
    where: { tokenHash: hashToken(body.token), usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  })
  if (!handoff) return c.json({ code: 'AUTH_GOOGLE_HANDOFF_INVALID', message: 'Google login session expired.' }, 401)
  await prisma.authHandoff.update({ where: { id: handoff.id }, data: { usedAt: new Date() } })
  const tokens = await createSession(handoff.userId, c.req.header('User-Agent'))
  return c.json({ ...tokens, user: { id: handoff.user.id, name: handoff.user.name, email: handoff.user.email } })
})

authRoutes.post('/refresh', async (c) => {
  const body = z.object({ refreshToken: z.string().min(1) }).parse(await c.req.json())
  const session = await prisma.userSession.findFirst({
    where: { refreshTokenHash: hashToken(body.refreshToken), revokedAt: null, expiresAt: { gt: new Date() } },
  })
  if (!session) return c.json({ code: 'AUTH_SESSION_EXPIRED', message: 'Refresh token expired.' }, 401)
  return c.json({ accessToken: signAccessToken({ sub: session.userId, sid: session.id }) })
})

authRoutes.post('/logout', requireAuth, async (c) => {
  const user = c.get('user') as { id: string; sessionId: string }
  await prisma.userSession.update({ where: { id: user.sessionId }, data: { revokedAt: new Date() } }).catch(() => undefined)
  return c.json({ status: 'ok' })
})

authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, name: true, email: true, status: true } })
  return c.json({ user: record })
})

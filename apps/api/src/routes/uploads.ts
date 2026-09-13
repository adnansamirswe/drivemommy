import { Hono } from 'hono'
import { google } from 'googleapis'
import { Readable } from 'node:stream'
import { prisma } from '../config/db.js'
import { env } from '../config/env.js'
import { requireApiKey, requireAuth } from '../middleware/auth.js'
import { ensureAppFolder, getAuthedGoogleClient, syncGoogleQuota } from '../modules/google.js'

export const uploadRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

type Eligible = { id: string; email: string; available: bigint | null; createdAt: Date }

async function selectAccount(userId: string, sizeBytes: bigint, targetAccountId?: string | null) {
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId, provider: 'google_drive', status: 'connected', ...(targetAccountId ? { id: targetAccountId } : {}) },
    include: { storageAccount: true },
  })
  for (const a of accounts.filter((x) => !x.storageAccount?.lastSyncedAt)) {
    await syncGoogleQuota(a.id).catch(() => undefined)
  }
  const fresh = await prisma.connectedAccount.findMany({
    where: { userId, provider: 'google_drive', status: 'connected' },
    include: { storageAccount: true },
  })
  const eligible: Eligible[] = fresh
    .filter((a) => a.storageAccount?.availableBytes == null || a.storageAccount.availableBytes >= sizeBytes)
    .map((a) => ({ id: a.id, email: a.email, available: a.storageAccount?.availableBytes ?? null, createdAt: a.createdAt }))
  if (eligible.length === 0) return null
  if (targetAccountId) return fresh.find((a) => a.id === targetAccountId) ?? null
  const policy = await prisma.uploadRoutingPolicy.upsert({
    where: { userId }, create: { userId, mode: 'most_available', priorityAccountIds: [] }, update: {},
  })
  if (policy.mode === 'round_robin') {
    const picked = eligible[policy.roundRobinCursor % eligible.length]
    await prisma.uploadRoutingPolicy.update({ where: { userId }, data: { roundRobinCursor: policy.roundRobinCursor + 1 } })
    return fresh.find((a) => a.id === picked.id) ?? null
  }
  eligible.sort((a, b) => {
    if (a.available === null && b.available === null) return 0
    if (a.available === null) return 1
    if (b.available === null) return -1
    return Number(b.available - a.available)
  })
  return fresh.find((a) => a.id === eligible[0].id) ?? null
}

async function streamUploadToDrive(userId: string, body: ArrayBuffer, fileName: string, mimeType: string, folderId?: string | null, targetAccountId?: string | null) {
  const sizeBytes = BigInt(body.byteLength)
  if (sizeBytes <= 0n) throw new Error('Empty file.')
  if (sizeBytes > BigInt(env.MAX_UPLOAD_BYTES)) throw new Error('File exceeds max upload size.')
  let resolvedTarget = targetAccountId ?? null
  if (folderId) {
    const folder = await prisma.folder.findFirstOrThrow({ where: { id: folderId, userId, deletedAt: null } })
    if (folder.connectedAccountId) resolvedTarget = folder.connectedAccountId
  }
  const account = await selectAccount(userId, sizeBytes, resolvedTarget)
  if (!account) throw new Error('No connected Drive has enough space.')
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })
  const appFolderId = await ensureAppFolder(account)
  const uploaded = await drive.files.create({
    requestBody: { name: fileName, parents: [appFolderId] },
    media: { mimeType, body: Readable.from(Buffer.from(body)) },
    fields: 'id,name,mimeType,size',
  })
  const file = await prisma.file.create({
    data: {
      userId, connectedAccountId: account.id, folderId: folderId ?? null,
      provider: 'google_drive', providerFileId: uploaded.data.id ?? '',
      name: uploaded.data.name ?? fileName, mimeType: uploaded.data.mimeType ?? mimeType, sizeBytes,
    },
  })
  syncGoogleQuota(account.id).catch(() => undefined)
  return { ...file, sizeBytes: file.sizeBytes.toString() }
}

async function handleMultipart(c: { req: { raw: Request }; get: (k: string) => { id: string } | undefined; json: (d: unknown, s?: number) => Response }) {
  const user = c.get('user') as { id: string }
  const form = await c.req.raw.formData()
  const file = form.get('file')
  const folderId = form.get('folderId')?.toString() ?? null
  const targetAccountId = form.get('targetAccountId')?.toString() ?? form.get('accountId')?.toString() ?? null
  if (!(file instanceof File)) return c.json({ code: 'UPLOAD_FILE_REQUIRED', message: 'file field required.' }, 400)
  const buffer = await file.arrayBuffer()
  try {
    const created = await streamUploadToDrive(user.id, buffer, file.name, file.type || 'application/octet-stream', folderId, targetAccountId)
    return c.json({ file: created }, 201)
  } catch (e) {
    return c.json({ code: 'UPLOAD_FAILED', message: e instanceof Error ? e.message : 'Upload failed' }, 400)
  }
}

// Dashboard (JWT) + public API (key) share the same handler
uploadRoutes.post('/', requireAuth, async (c) => handleMultipart(c as never))
uploadRoutes.post('/api-upload', requireApiKey('files:upload'), async (c) => handleMultipart(c as never))

export { streamUploadToDrive }

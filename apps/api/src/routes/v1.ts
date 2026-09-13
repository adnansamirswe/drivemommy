import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { requireApiKey } from '../middleware/auth.js'
import { getAuthedGoogleClient } from '../modules/google.js'
import { streamUploadToDrive } from './uploads.js'

/** Public developer API: Bearer dm_live_* keys */
export const v1Routes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

v1Routes.post('/uploads', requireApiKey('files:upload'), async (c) => {
  const user = c.get('user') as { id: string }
  const form = await c.req.raw.formData()
  const file = form.get('file')
  const folderId = form.get('folderId')?.toString() ?? null
  const targetAccountId = form.get('targetAccountId')?.toString() ?? form.get('accountId')?.toString() ?? null
  if (!(file instanceof File)) return c.json({ code: 'UPLOAD_FILE_REQUIRED', message: 'file field required.' }, 400)
  try {
    const created = await streamUploadToDrive(user.id, await file.arrayBuffer(), file.name, file.type || 'application/octet-stream', folderId, targetAccountId)
    return c.json({ file: created }, 201)
  } catch (e) {
    return c.json({ code: 'UPLOAD_FAILED', message: e instanceof Error ? e.message : 'Upload failed' }, 400)
  }
})

v1Routes.get('/files', requireApiKey('files:read'), async (c) => {
  const user = c.get('user') as { id: string }
  const url = new URL(c.req.url)
  const q = z.object({ q: z.string().optional(), folderId: z.string().optional(), accountId: z.string().optional(), limit: z.coerce.number().min(1).max(100).default(50) })
    .parse(Object.fromEntries(url.searchParams))
  const files = await prisma.file.findMany({
    where: {
      userId: user.id, status: 'active',
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
      ...(q.folderId ? { folderId: q.folderId } : {}),
      ...(q.accountId ? { connectedAccountId: q.accountId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: q.limit,
  })
  return c.json({ files: files.map((f) => ({ ...f, sizeBytes: f.sizeBytes.toString() })) })
})

v1Routes.get('/files/:id', requireApiKey('files:read'), async (c) => {
  const user = c.get('user') as { id: string }
  const file = await prisma.file.findFirst({ where: { id: c.req.param('id'), userId: user.id } })
  if (!file) return c.json({ code: 'FILE_NOT_FOUND', message: 'File not found.' }, 404)
  return c.json({ file: { ...file, sizeBytes: file.sizeBytes.toString() } })
})

v1Routes.get('/files/:id/download', requireApiKey('files:download'), async (c) => {
  const user = c.get('user') as { id: string }
  const file = await prisma.file.findFirst({ where: { id: c.req.param('id'), userId: user.id }, include: { connectedAccount: true } })
  if (!file) return c.json({ code: 'FILE_NOT_FOUND', message: 'File not found.' }, 404)
  const auth = await getAuthedGoogleClient(file.connectedAccount)
  const headers = await auth.getRequestHeaders()
  const upstream = await fetch(`https://www.googleapis.com/drive/v3/files/${file.providerFileId}?alt=media`, { headers: headers as HeadersInit })
  if (!upstream.ok || !upstream.body) return c.json({ code: 'UPSTREAM_FAILED', message: 'Drive download failed.' }, 502)
  return new Response(upstream.body, {
    headers: { 'Content-Type': file.mimeType, 'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"` },
  })
})

v1Routes.delete('/files/:id', requireApiKey('files:delete'), async (c) => {
  const user = c.get('user') as { id: string }
  await prisma.file.updateMany({ where: { id: c.req.param('id'), userId: user.id }, data: { status: 'deleted', deletedAt: new Date() } })
  return c.json({ status: 'ok' })
})

v1Routes.get('/storage/summary', requireApiKey('storage:read'), async (c) => {
  const user = c.get('user') as { id: string }
  const accounts = await prisma.connectedAccount.findMany({ where: { userId: user.id, status: 'connected' }, include: { storageAccount: true } })
  return c.json({
    accounts: accounts.map((a) => ({
      id: a.id, provider: a.provider, email: a.email,
      totalBytes: a.storageAccount?.totalBytes?.toString() ?? null,
      usedBytes: a.storageAccount?.usedBytes.toString() ?? '0',
      availableBytes: a.storageAccount?.availableBytes?.toString() ?? null,
    })),
  })
})

v1Routes.get('/accounts', requireApiKey('accounts:read'), async (c) => {
  const user = c.get('user') as { id: string }
  const accounts = await prisma.connectedAccount.findMany({ where: { userId: user.id, status: 'connected' } })
  return c.json({ accounts: accounts.map(({ accessTokenEncrypted: _a, refreshTokenEncrypted: _r, ...rest }) => rest) })
})

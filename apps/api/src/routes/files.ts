import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import { syncGoogleAppFolderFiles } from '../modules/google.js'

export const fileRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

fileRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const url = new URL(c.req.url)
  const query = z
    .object({ folderId: z.string().optional(), q: z.string().max(255).optional(), accountId: z.string().optional(), limit: z.coerce.number().min(1).max(100).default(50) })
    .parse(Object.fromEntries(url.searchParams))
  const files = await prisma.file.findMany({
    where: {
      userId: user.id, status: 'active',
      ...(query.folderId ? { folderId: query.folderId } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.accountId ? { connectedAccountId: query.accountId } : {}),
    },
    include: { connectedAccount: { select: { id: true, email: true, provider: true } } },
    orderBy: { createdAt: 'desc' },
    take: query.limit,
  })
  return c.json({ files: files.map((f) => ({ ...f, sizeBytes: f.sizeBytes.toString() })) })
})

fileRoutes.post('/sync-google', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const body = z.object({
    connectedAccountId: z.string().min(1).optional(),
    scope: z.enum(['drivemommy', 'full']).default('drivemommy'),
  }).parse(await c.req.json().catch(() => ({})))
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId: user.id, provider: 'google_drive', status: 'connected', ...(body.connectedAccountId ? { id: body.connectedAccountId } : {}) },
    select: { id: true },
  })
  const results = []
  for (const account of accounts) results.push(await syncGoogleAppFolderFiles(account.id, user.id, body.scope))
  return c.json({ status: 'ok', results })
})

fileRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const file = await prisma.file.findFirstOrThrow({ where: { id: c.req.param('id'), userId: user.id } })
  return c.json({ file: { ...file, sizeBytes: file.sizeBytes.toString() } })
})

fileRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  await prisma.file.updateMany({ where: { id: c.req.param('id'), userId: user.id }, data: { status: 'deleted', deletedAt: new Date() } })
  return c.json({ status: 'ok' })
})

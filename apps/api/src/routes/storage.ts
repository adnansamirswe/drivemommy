import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

export const storageRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

storageRoutes.get('/summary', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const accounts = await prisma.connectedAccount.findMany({ where: { userId: user.id, status: 'connected' }, include: { storageAccount: true } })
  const totals = accounts.reduce(
    (acc, a) => ({
      total: acc.total + (a.storageAccount?.totalBytes ?? 0n),
      used: acc.used + (a.storageAccount?.usedBytes ?? 0n),
      available: acc.available + (a.storageAccount?.availableBytes ?? 0n),
    }),
    { total: 0n, used: 0n, available: 0n },
  )
  return c.json({
    totalBytes: totals.total.toString(),
    usedBytes: totals.used.toString(),
    availableBytes: totals.available.toString(),
    accounts: accounts.map((a) => ({
      id: a.id, provider: a.provider, email: a.email, status: a.status,
      totalBytes: a.storageAccount?.totalBytes?.toString() ?? null,
      usedBytes: a.storageAccount?.usedBytes.toString() ?? '0',
      availableBytes: a.storageAccount?.availableBytes?.toString() ?? null,
      lastSyncedAt: a.storageAccount?.lastSyncedAt ?? null,
    })),
  })
})

storageRoutes.get('/routing-policy', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const policy = await prisma.uploadRoutingPolicy.upsert({
    where: { userId: user.id },
    create: { userId: user.id, mode: 'most_available', priorityAccountIds: [] },
    update: {},
  })
  return c.json({ policy: { ...policy, priorityAccountIds: Array.isArray(policy.priorityAccountIds) ? policy.priorityAccountIds : [] } })
})

storageRoutes.patch('/routing-policy', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const body = z
    .object({
      mode: z.enum(['most_available', 'round_robin', 'priority']),
      priorityAccountIds: z.array(z.string().min(1)).max(100).optional(),
    })
    .parse(await c.req.json())
  const ids = [...new Set(body.priorityAccountIds ?? [])]
  const valid = ids.length
    ? await prisma.connectedAccount.findMany({ where: { id: { in: ids }, userId: user.id, status: 'connected' }, select: { id: true } })
    : []
  const validIds = new Set(valid.map((a) => a.id))
  const policy = await prisma.uploadRoutingPolicy.upsert({
    where: { userId: user.id },
    create: { userId: user.id, mode: body.mode, priorityAccountIds: ids.filter((id) => validIds.has(id)), roundRobinCursor: 0 },
    update: {
      mode: body.mode,
      priorityAccountIds: ids.filter((id) => validIds.has(id)),
      ...(body.mode !== 'round_robin' ? { roundRobinCursor: 0 } : {}),
    },
  })
  return c.json({ policy: { ...policy, priorityAccountIds: Array.isArray(policy.priorityAccountIds) ? policy.priorityAccountIds : [] } })
})

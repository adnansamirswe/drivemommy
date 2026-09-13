import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

export const folderRoutes = new Hono<{ Variables: { user: { id: string; sessionId: string }; apiKeyId?: string } }>()

folderRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const folders = await prisma.folder.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: 'desc' } })
  return c.json({ folders })
})

folderRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  const body = z.object({ name: z.string().min(1).max(255), parentId: z.string().nullable().optional() }).parse(await c.req.json())
  const folder = await prisma.folder.create({ data: { userId: user.id, name: body.name, parentId: body.parentId ?? null } })
  return c.json({ folder }, 201)
})

folderRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user') as { id: string }
  await prisma.folder.updateMany({ where: { id: c.req.param('id'), userId: user.id }, data: { deletedAt: new Date() } })
  return c.json({ status: 'ok' })
})

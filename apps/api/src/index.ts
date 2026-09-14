import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './config/env.js'
import { authRoutes } from './routes/auth.js'
import { connectedAccountRoutes } from './routes/connected-accounts.js'
import { storageRoutes } from './routes/storage.js'
import { fileRoutes } from './routes/files.js'
import { folderRoutes } from './routes/folders.js'
import { uploadRoutes } from './routes/uploads.js'
import { apiKeyRoutes } from './routes/api-keys.js'
import { providerConfigRoutes } from './routes/provider-configs.js'
import { v1Routes } from './routes/v1.js'

const app = new Hono()

app.use('*', cors({ origin: env.FRONTEND_URL, allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }))

app.get('/health', (c) => c.json({ status: 'ok', service: 'mergedrive-api' }))

app.route('/auth', authRoutes)
app.route('/connected-accounts', connectedAccountRoutes)
app.route('/storage', storageRoutes)
app.route('/files', fileRoutes)
app.route('/folders', folderRoutes)
app.route('/uploads', uploadRoutes)
app.route('/api-keys', apiKeyRoutes)
app.route('/provider-configs', providerConfigRoutes)
app.route('/api/v1', v1Routes)

app.onError((err, c) => {
  console.error('[api]', err)
  if (err instanceof Error && err.message.startsWith('GOOGLE_OAUTH_NOT_CONFIGURED')) {
    return c.json({ code: 'GOOGLE_OAUTH_NOT_CONFIGURED', message: 'Save Google OAuth credentials in Settings first.' }, 400)
  }
  return c.json({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' }, 500)
})

const port = env.APP_PORT
export default { port, fetch: app.fetch }
console.log(`mergedrive-api listening on :${port}`)

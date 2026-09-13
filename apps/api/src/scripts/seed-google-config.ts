import { prisma } from '../config/db.js'
import { env } from '../config/env.js'
import { encryptText } from '../lib/crypto.js'
import { GOOGLE_SCOPES } from '../modules/google.js'

async function main() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in apps/api/.env')
    process.exit(1)
  }
  const existing = await prisma.providerConfig.findFirst({
    where: { userId: null, provider: 'google_drive', status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    await prisma.providerConfig.update({
      where: { id: existing.id },
      data: {
        clientIdEncrypted: encryptText(env.GOOGLE_CLIENT_ID),
        clientSecretEncrypted: encryptText(env.GOOGLE_CLIENT_SECRET),
        redirectUri: env.GOOGLE_REDIRECT_URI,
        scopes: GOOGLE_SCOPES,
      },
    })
    console.log(`Updated global google_drive provider config (${existing.id})`)
  } else {
    const created = await prisma.providerConfig.create({
      data: {
        userId: null,
        provider: 'google_drive',
        clientIdEncrypted: encryptText(env.GOOGLE_CLIENT_ID),
        clientSecretEncrypted: encryptText(env.GOOGLE_CLIENT_SECRET),
        redirectUri: env.GOOGLE_REDIRECT_URI,
        scopes: GOOGLE_SCOPES,
        status: 'active',
      },
    })
    console.log(`Created global google_drive provider config (${created.id})`)
  }
}

await main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

import { google } from 'googleapis'
import type { ConnectedAccount, ProviderConfig } from '@prisma/client'
import { prisma } from '../config/db.js'
import { env } from '../config/env.js'
import { decryptText, encryptText } from '../lib/crypto.js'

export const APP_FOLDER_NAME = 'drivemommy'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export function createOAuthClient(config: ProviderConfig) {
  return new google.auth.OAuth2(
    decryptText(config.clientIdEncrypted),
    decryptText(config.clientSecretEncrypted),
    env.GOOGLE_REDIRECT_URI || config.redirectUri,
  )
}

export async function getAuthedGoogleClient(account: ConnectedAccount) {
  if (!account.accessTokenEncrypted || !account.refreshTokenEncrypted || !account.tokenExpiresAt) {
    throw new Error('Google account tokens are missing.')
  }
  if (!account.providerConfigId) throw new Error('Google provider config is missing.')
  const config = await prisma.providerConfig.findUniqueOrThrow({ where: { id: account.providerConfigId } })
  const client = createOAuthClient(config)
  client.setCredentials({
    access_token: decryptText(account.accessTokenEncrypted),
    refresh_token: decryptText(account.refreshTokenEncrypted),
    expiry_date: account.tokenExpiresAt.getTime(),
  })
  if (account.tokenExpiresAt.getTime() < Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken()
    if (credentials.access_token) {
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptText(credentials.access_token),
          tokenExpiresAt: new Date(credentials.expiry_date ?? Date.now() + 3_600_000),
        },
      })
      client.setCredentials(credentials)
    }
  }
  return client
}

export async function syncGoogleQuota(accountId: string) {
  const account = await prisma.connectedAccount.findUniqueOrThrow({ where: { id: accountId } })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })
  const about = await drive.about.get({ fields: 'storageQuota' })
  const q = about.data.storageQuota
  const total = q?.limit ? BigInt(q.limit) : null
  const used = q?.usage ? BigInt(q.usage) : 0n
  return prisma.storageAccount.upsert({
    where: { connectedAccountId: accountId },
    create: {
      connectedAccountId: accountId,
      totalBytes: total,
      usedBytes: used,
      availableBytes: total === null ? null : total - used,
      trashBytes: q?.usageInDriveTrash ? BigInt(q.usageInDriveTrash) : null,
      lastSyncedAt: new Date(),
    },
    update: {
      totalBytes: total,
      usedBytes: used,
      availableBytes: total === null ? null : total - used,
      trashBytes: q?.usageInDriveTrash ? BigInt(q.usageInDriveTrash) : null,
      lastSyncedAt: new Date(),
    },
  })
}

export async function ensureAppFolder(account: ConnectedAccount): Promise<string> {
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })
  const existing = await drive.files.list({
    q: `name = '${APP_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and 'root' in parents and trashed = false`,
    spaces: 'drive',
    fields: 'files(id,name)',
    pageSize: 1,
  })
  const id =
    existing.data.files?.[0]?.id ??
    (await drive.files.create({ requestBody: { name: APP_FOLDER_NAME, mimeType: FOLDER_MIME, parents: ['root'] }, fields: 'id' })).data.id
  if (!id) throw new Error('Failed to create Drive app folder.')
  return id
}

export type SyncResult = {
  accountId: string
  created: number
  updated: number
  deleted: number
}

export async function syncGoogleAppFolderFiles(accountId: string, userId: string, scope: 'drivemommy' | 'full' = 'drivemommy'): Promise<SyncResult> {
  const account = await prisma.connectedAccount.findFirstOrThrow({ where: { id: accountId, userId, provider: 'google_drive', status: 'connected' } })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })

  const userFolders = await prisma.folder.findMany({
    where: { userId, connectedAccountId: account.id, deletedAt: null },
    select: { id: true, providerFolderId: true },
  })

  const q = scope === 'drivemommy'
    ? `'${await ensureAppFolder(account)}' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`
    : `mimeType != '${FOLDER_MIME}' and trashed = false`

  const driveFiles: { id: string; name: string; mimeType: string; sizeBytes: bigint; parentId: string }[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q, spaces: 'drive',
      fields: 'nextPageToken,files(id,name,mimeType,size,parents)',
      pageSize: 1000,
      pageToken,
    })
    for (const file of response.data.files ?? []) {
      if (!file.id || !file.name || !file.mimeType) continue
      driveFiles.push({ id: file.id, name: file.name, mimeType: file.mimeType, sizeBytes: BigInt(file.size ?? 0), parentId: file.parents?.[0] ?? '' })
    }
    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  const existingFiles = await prisma.file.findMany({ where: { userId, connectedAccountId: account.id, provider: 'google_drive' } })
  const existingByProviderId = new Map(existingFiles.map((file) => [file.providerFileId, file]))
  const driveFileIds = new Set(driveFiles.map((f) => f.id))
  const folderIdMap = new Map(userFolders.map((f) => [f.providerFolderId, f.id]))

  let created = 0, updated = 0, deleted = 0

  for (const driveFile of driveFiles) {
    const dbFolderId = folderIdMap.get(driveFile.parentId) ?? null
    const existing = existingByProviderId.get(driveFile.id)
    if (!existing) {
      await prisma.file.create({
        data: { userId, connectedAccountId: account.id, provider: 'google_drive', providerFileId: driveFile.id, name: driveFile.name, mimeType: driveFile.mimeType, sizeBytes: driveFile.sizeBytes, status: 'active', folderId: dbFolderId },
      })
      created += 1
      continue
    }
    const needsUpdate = existing.name !== driveFile.name || existing.mimeType !== driveFile.mimeType || existing.sizeBytes !== driveFile.sizeBytes || existing.status !== 'active' || existing.deletedAt !== null || existing.folderId !== dbFolderId
    if (needsUpdate) {
      await prisma.file.update({ where: { id: existing.id }, data: { name: driveFile.name, mimeType: driveFile.mimeType, sizeBytes: driveFile.sizeBytes, status: 'active', deletedAt: null, folderId: dbFolderId } })
      updated += 1
    }
  }

  const missingActiveIds = existingFiles.filter((f) => f.status === 'active' && !driveFileIds.has(f.providerFileId)).map((f) => f.id)
  if (missingActiveIds.length > 0) {
    const result = await prisma.file.updateMany({ where: { id: { in: missingActiveIds }, userId }, data: { status: 'deleted', deletedAt: new Date() } })
    deleted = result.count
  }

  await syncGoogleQuota(account.id).catch(() => undefined)
  return { accountId: account.id, created, updated, deleted }
}

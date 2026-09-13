import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { env } from '../config/env.js'

function key(): Buffer {
  const raw = env.TOKEN_ENCRYPTION_KEY
  // Accept 32-char string or 64-char hex
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  return createHash('sha256').update(raw).digest()
}

export function encryptText(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${enc.toString('base64')}.${tag.toString('base64')}`
}

export function decryptText(payload: string): string {
  const [ivB64, encB64, tagB64] = payload.split('.')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

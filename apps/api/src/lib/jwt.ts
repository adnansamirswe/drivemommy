import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function signAccessToken(payload: { sub: string; sid: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS })
}

export function verifyAccessToken(token: string): { sub: string; sid: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; sid: string }
}

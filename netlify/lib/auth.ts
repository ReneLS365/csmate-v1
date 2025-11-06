// netlify/lib/auth.ts
import crypto from 'crypto'

export interface AdminTokenPayload {
  tenantId: string
  tenantSlug: string
  matchedKey: string
  issuedAt: string
  expiresAt: string
}

const TOKEN_TTL_MINUTES = 60

const TOKEN_SEPARATOR = '.'

const base64UrlEncode = (input: Buffer | string) => {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

const base64UrlDecode = (input: string) => {
  const padLength = (4 - (input.length % 4)) % 4
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength)
  return Buffer.from(padded, 'base64').toString('utf8')
}

const getSecret = () => {
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) {
    throw new Error('Missing ADMIN_TOKEN_SECRET environment variable')
  }
  return secret
}

export const signAdminToken = (
  payload: Pick<AdminTokenPayload, 'tenantId' | 'tenantSlug' | 'matchedKey'>,
  ttlMinutes: number = TOKEN_TTL_MINUTES,
) => {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + ttlMinutes * 60 * 1000)

  const tokenPayload: AdminTokenPayload = {
    ...payload,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  const payloadJson = JSON.stringify(tokenPayload)
  const encodedPayload = base64UrlEncode(payloadJson)
  const hmac = crypto.createHmac('sha256', getSecret())
  hmac.update(encodedPayload)
  const signature = base64UrlEncode(hmac.digest())

  return `${encodedPayload}${TOKEN_SEPARATOR}${signature}`
}

export const verifyAdminToken = (token: string): AdminTokenPayload => {
  const [encodedPayload, providedSignature] = token.split(TOKEN_SEPARATOR)

  if (!encodedPayload || !providedSignature) {
    throw new Error('Invalid token format')
  }

  const hmac = crypto.createHmac('sha256', getSecret())
  hmac.update(encodedPayload)
  const expectedSignature = base64UrlEncode(hmac.digest())

  const providedBuffer = Buffer.from(providedSignature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature')
  }

  const payload: AdminTokenPayload = JSON.parse(base64UrlDecode(encodedPayload))

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new Error('Token expired')
  }

  return payload
}

export const extractBearerToken = (headers: Record<string, string | undefined>) => {
  const headerValue = headers?.authorization ?? headers?.Authorization
  if (!headerValue) {
    return null
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

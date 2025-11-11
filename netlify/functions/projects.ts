// netlify/functions/projects.ts
import { db } from '../../src/lib/db.ts'
import { projects } from '../../src/lib/schema.ts'
import { eq } from 'drizzle-orm'
import { extractBearerToken, verifyAdminToken } from '../lib/auth'

type EventLike = {
  httpMethod: string
  headers?: Record<string, string>
  queryStringParameters?: Record<string, string>
  body?: string
}

const json = (statusCode: number, body: Record<string, any>) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' }
})

const parseBody = (raw: string | undefined) => {
  if (!raw) return { error: 'Body mangler', data: null }
  try {
    const data = JSON.parse(raw)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Body skal være gyldig JSON' }
  }
}

const sanitizeString = (value: unknown) => typeof value === 'string' ? value.trim() : ''

const validateProjectPayload = (payload: any, tenantId: string) => {
  const errors: string[] = []
  const data: Record<string, any> = {}

  const incomingTenant = sanitizeString(payload?.tenantId)
  if (!incomingTenant) errors.push('tenantId kræves')
  if (incomingTenant && incomingTenant !== tenantId) errors.push('Ingen adgang til tenant')
  data.tenantId = incomingTenant

  const code = sanitizeString(payload?.code)
  if (!code) errors.push('code kræves')
  data.code = code

  const name = sanitizeString(payload?.name)
  if (!name) errors.push('name kræves')
  data.name = name

  const address = sanitizeString(payload?.address)
  data.address = address || null

  const city = sanitizeString(payload?.city)
  data.city = city || null

  const status = sanitizeString(payload?.status)
  data.status = status || 'open'

  const startDate = sanitizeString(payload?.startDate)
  data.startDate = startDate || null

  const endDate = sanitizeString(payload?.endDate)
  data.endDate = endDate || null

  const createdByUserId = sanitizeString(payload?.createdByUserId)
  data.createdByUserId = createdByUserId || null

  return { valid: errors.length === 0, data, errors }
}

const handler = async (event: EventLike) => {
  try {
    const method = event.httpMethod

    const token = extractBearerToken(event.headers ?? {})
    if (!token) {
      return json(401, { error: 'Authorization token mangler' })
    }

    let auth
    try {
      auth = verifyAdminToken(token)
    } catch (error) {
      console.error('projects token verification failed', error)
      return json(401, { error: 'Ugyldigt eller udløbet token' })
    }

    if (method === 'GET') {
      const tenantId = sanitizeString(event.queryStringParameters?.tenantId)
      if (!tenantId) {
        return json(400, { error: 'tenantId kræves' })
      }
      if (tenantId !== auth.tenantId) {
        return json(403, { error: 'Ingen adgang til tenant' })
      }

      try {
        const rows = await db.select().from(projects).where(eq(projects.tenantId, tenantId))
        return json(200, rows)
      } catch (error) {
        console.error('projects select failed', error)
        return json(500, { error: 'Databasefejl ved hentning af projekter' })
      }
    }

    if (method === 'POST') {
      const { data: payload, error } = parseBody(event.body)
      if (error) {
        return json(400, { error })
      }

      const { valid, data, errors } = validateProjectPayload(payload, auth.tenantId)
      if (!valid) {
        const status = errors.includes('Ingen adgang til tenant') ? 403 : 400
        return json(status, { error: 'Ugyldig payload', details: errors })
      }

      try {
        const [inserted] = await db.insert(projects).values(data).returning()
        return json(200, inserted)
      } catch (error) {
        console.error('projects insert failed', error)
        return json(500, { error: 'Databasefejl ved oprettelse af projekt' })
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' }
  } catch (error) {
    console.error('projects function error', error)
    return json(500, { error: 'Internal Server Error' })
  }
}

export default handler

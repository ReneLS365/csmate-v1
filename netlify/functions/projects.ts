// netlify/functions/projects.ts
import { db } from '../../src/lib/db.ts'
import { projects } from '../../src/lib/schema.ts'
import { eq } from 'drizzle-orm'
import { extractBearerToken, verifyAdminToken } from '../lib/auth'

const handler = async (event: any) => {
  try {
    const method = event.httpMethod

    const token = extractBearerToken(event.headers ?? {})
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authorization token mangler' }),
        headers: { 'Content-Type': 'application/json' },
      }
    }

    let auth
    try {
      auth = verifyAdminToken(token)
    } catch (error) {
      console.error('projects token verification failed', error)
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Ugyldigt eller udløbet token' }),
        headers: { 'Content-Type': 'application/json' },
      }
    }

    if (method === 'GET') {
      const tenantId = event.queryStringParameters?.tenantId
      if (!tenantId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'tenantId kræves' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      if (tenantId !== auth.tenantId) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Ingen adgang til tenant' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      const rows = await db.select().from(projects).where(eq(projects.tenantId, tenantId))
      return {
        statusCode: 200,
        body: JSON.stringify(rows),
        headers: { 'Content-Type': 'application/json' },
      }
    }

    if (method === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Body mangler' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      const data = JSON.parse(event.body)

      if (!data.tenantId || data.tenantId !== auth.tenantId) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Ingen adgang til tenant' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      const [inserted] = await db.insert(projects).values({
        tenantId: data.tenantId,
        code: data.code,
        name: data.name,
        address: data.address ?? null,
        city: data.city ?? null,
        status: data.status ?? 'open',
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        createdByUserId: data.createdByUserId ?? null,
      }).returning()

      return {
        statusCode: 200,
        body: JSON.stringify(inserted),
        headers: { 'Content-Type': 'application/json' },
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' }
  } catch (err: any) {
    console.error('projects function error', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) }
  }
}

export default handler

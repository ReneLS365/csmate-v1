// netlify/functions/projects.ts
import { db } from '../../src/lib/db'
import { projects } from '../../src/lib/schema'
import { eq } from 'drizzle-orm'

const handler = async (event: any) => {
  try {
    const method = event.httpMethod

    if (method === 'GET') {
      const tenantId = event.queryStringParameters?.tenantId
      if (!tenantId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'tenantId kræves' }) }
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
        return { statusCode: 400, body: JSON.stringify({ error: 'Body mangler' }) }
      }

      const data = JSON.parse(event.body)

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

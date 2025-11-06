// netlify/functions/sheets.ts
import { db } from '../../src/lib/db'
import { akkordSheets, projects } from '../../src/lib/schema'
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
      console.error('sheets token verification failed', error)
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Ugyldigt eller udløbet token' }),
        headers: { 'Content-Type': 'application/json' },
      }
    }

    if (method === 'GET') {
      const projectId = event.queryStringParameters?.projectId
      if (!projectId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'projectId kræves' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      const [project] = await db
        .select({ tenantId: projects.tenantId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)

      if (!project || project.tenantId !== auth.tenantId) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Ingen adgang til projektet' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      const rows = await db.select().from(akkordSheets).where(eq(akkordSheets.projectId, projectId))
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

      if (!data.projectId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'projectId kræves' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      const [project] = await db
        .select({ tenantId: projects.tenantId })
        .from(projects)
        .where(eq(projects.id, data.projectId))
        .limit(1)

      if (!project || project.tenantId !== auth.tenantId) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Ingen adgang til projektet' }),
          headers: { 'Content-Type': 'application/json' },
        }
      }

      const [inserted] = await db
        .insert(akkordSheets)
        .values({
          tenantId: data.tenantId,
          projectId: data.projectId,
          sheetNo: data.sheetNo,
          phase: data.phase ?? 'montage',
          system: data.system ?? null,
          payProfileId: data.payProfileId ?? null,
          hoursTotal: data.hoursTotal ?? '0',
          kmTotal: data.kmTotal ?? '0',
          slæbPercent: data.slaebPercent ?? '0',
          extraPercent: data.extraPercent ?? '0',
          demontageFactor: data.demontageFactor ?? '0.50',
          materialSum: data.materialSum ?? '0',
          montageSum: data.montageSum ?? '0',
          demontageSum: data.demontageSum ?? '0',
          totalAmount: data.totalAmount ?? '0',
          hourRate: data.hourRate ?? '0',
          createdByUserId: data.createdByUserId ?? null,
        })
        .returning()

      return {
        statusCode: 200,
        body: JSON.stringify(inserted),
        headers: { 'Content-Type': 'application/json' },
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' }
  } catch (err: any) {
    console.error('sheets function error', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) }
  }
}

export default handler

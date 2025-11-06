// netlify/functions/sheets.ts
import { db } from '../../src/lib/db'
import { akkordSheets } from '../../src/lib/schema'
import { eq } from 'drizzle-orm'

const handler = async (event: any) => {
  try {
    const method = event.httpMethod

    if (method === 'GET') {
      const projectId = event.queryStringParameters?.projectId
      if (!projectId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'projectId kræves' }) }
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
        return { statusCode: 400, body: JSON.stringify({ error: 'Body mangler' }) }
      }

      const data = JSON.parse(event.body)

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

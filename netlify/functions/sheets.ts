// netlify/functions/sheets.ts
import { db } from '../../src/lib/db.ts'
import { akkordSheets, projects } from '../../src/lib/schema.ts'
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

const sanitizeString = (value: unknown) => typeof value === 'string' ? value.trim() : ''

const parseBody = (raw: string | undefined) => {
  if (!raw) return { error: 'Body mangler', data: null }
  try {
    const data = JSON.parse(raw)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Body skal være gyldig JSON' }
  }
}

const validateSheetPayload = (payload: any, tenantId: string) => {
  const errors: string[] = []
  const data: Record<string, any> = {}

  const incomingTenant = sanitizeString(payload?.tenantId)
  if (!incomingTenant) errors.push('tenantId kræves')
  if (incomingTenant && incomingTenant !== tenantId) errors.push('Ingen adgang til tenant')
  data.tenantId = incomingTenant

  const projectId = sanitizeString(payload?.projectId)
  if (!projectId) errors.push('projectId kræves')
  data.projectId = projectId

  const sheetNo = sanitizeString(payload?.sheetNo)
  if (!sheetNo) errors.push('sheetNo kræves')
  data.sheetNo = sheetNo

  data.phase = sanitizeString(payload?.phase) || 'montage'
  data.system = sanitizeString(payload?.system) || null
  data.payProfileId = sanitizeString(payload?.payProfileId) || null
  data.hoursTotal = sanitizeString(payload?.hoursTotal) || '0'
  data.kmTotal = sanitizeString(payload?.kmTotal) || '0'
  data.slaebPercent = sanitizeString(payload?.slaebPercent) || '0'
  data.extraPercent = sanitizeString(payload?.extraPercent) || '0'
  data.demontageFactor = sanitizeString(payload?.demontageFactor) || '0.50'
  data.materialSum = sanitizeString(payload?.materialSum) || '0'
  data.montageSum = sanitizeString(payload?.montageSum) || '0'
  data.demontageSum = sanitizeString(payload?.demontageSum) || '0'
  data.totalAmount = sanitizeString(payload?.totalAmount) || '0'
  data.hourRate = sanitizeString(payload?.hourRate) || '0'
  data.createdByUserId = sanitizeString(payload?.createdByUserId) || null

  return { valid: errors.length === 0, data, errors }
}

const ensureProjectForTenant = async (projectId: string, tenantId: string) => {
  const [project] = await db
    .select({ tenantId: projects.tenantId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return project && project.tenantId === tenantId
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
      console.error('sheets token verification failed', error)
      return json(401, { error: 'Ugyldigt eller udløbet token' })
    }

    if (method === 'GET') {
      const projectId = sanitizeString(event.queryStringParameters?.projectId)
      if (!projectId) {
        return json(400, { error: 'projectId kræves' })
      }

      try {
        const allowed = await ensureProjectForTenant(projectId, auth.tenantId)
        if (!allowed) {
          return json(403, { error: 'Ingen adgang til projektet' })
        }
      } catch (error) {
        console.error('sheets project lookup failed', error)
        return json(500, { error: 'Databasefejl ved validering af projekt' })
      }

      try {
        const rows = await db.select().from(akkordSheets).where(eq(akkordSheets.projectId, projectId))
        return json(200, rows)
      } catch (error) {
        console.error('sheets select failed', error)
        return json(500, { error: 'Databasefejl ved hentning af akkordsedler' })
      }
    }

    if (method === 'POST') {
      const { data: payload, error } = parseBody(event.body)
      if (error) {
        return json(400, { error })
      }

      const { valid, data, errors } = validateSheetPayload(payload, auth.tenantId)
      if (!valid) {
        const status = errors.includes('Ingen adgang til tenant') ? 403 : 400
        return json(status, { error: 'Ugyldig payload', details: errors })
      }

      try {
        const allowed = await ensureProjectForTenant(data.projectId, auth.tenantId)
        if (!allowed) {
          return json(403, { error: 'Ingen adgang til projektet' })
        }
      } catch (error) {
        console.error('sheets project validation failed', error)
        return json(500, { error: 'Databasefejl ved validering af projekt' })
      }

      try {
        const [inserted] = await db.insert(akkordSheets).values(data).returning()
        return json(200, inserted)
      } catch (error) {
        console.error('sheets insert failed', error)
        return json(500, { error: 'Databasefejl ved oprettelse af ark' })
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' }
  } catch (error) {
    console.error('sheets function error', error)
    return json(500, { error: 'Internal Server Error' })
  }
}

export default handler

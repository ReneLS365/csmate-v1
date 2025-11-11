// netlify/functions/powerlogin.ts
import { db } from '../../src/lib/db.ts'
import { tenants, adminKeys, roles } from '../../src/lib/schema.ts'
import { eq, and, asc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { signAdminToken } from '../lib/auth'

type EventLike = {
  httpMethod: string
  body?: string
}

const json = (statusCode: number, body: Record<string, any>) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' }
})

const sanitizeString = (value: unknown) => typeof value === 'string' ? value.trim() : ''

const handler = async (event: EventLike) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    if (!event.body) {
      return json(400, { error: 'Body mangler' })
    }

    let parsed
    try {
      parsed = JSON.parse(event.body)
    } catch {
      return json(400, { error: 'Body skal være gyldig JSON' })
    }

    const tenantSlug = sanitizeString(parsed?.tenantSlug)
    const adminKey = sanitizeString(parsed?.adminKey)

    const errors = []
    if (!tenantSlug) errors.push('tenantSlug kræves')
    if (!adminKey) errors.push('adminKey kræves')
    if (errors.length) {
      return json(400, { error: 'Ugyldig payload', details: errors })
    }

    let tenant
    try {
      const rows = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1)
      tenant = rows[0]
    } catch (error) {
      console.error('powerlogin tenant lookup failed', error)
      return json(500, { error: 'Databasefejl ved opslag af tenant' })
    }

    if (!tenant) {
      return json(404, { error: 'Tenant ikke fundet' })
    }

    let keys
    try {
      keys = await db
        .select({ id: adminKeys.id, label: adminKeys.label, keyHash: adminKeys.keyHash })
        .from(adminKeys)
        .where(and(eq(adminKeys.tenantId, tenant.id), eq(adminKeys.isActive, true)))
    } catch (error) {
      console.error('powerlogin key lookup failed', error)
      return json(500, { error: 'Databasefejl ved hentning af admin-nøgler' })
    }

    if (!keys.length) {
      return json(403, { error: 'Ingen aktive admin keys for tenant' })
    }

    let matchedKey: { id: number; label: string } | null = null

    for (const key of keys) {
      try {
        const ok = await bcrypt.compare(adminKey, key.keyHash)
        if (ok) {
          matchedKey = { id: key.id, label: key.label }
          break
        }
      } catch (error) {
        console.error('powerlogin compare failed', error)
        return json(500, { error: 'Fejl ved validering af admin key' })
      }
    }

    if (!matchedKey) {
      return json(401, { error: 'Ugyldig admin key' })
    }

    let tenantRoles
    try {
      tenantRoles = await db
        .select({ id: roles.id, code: roles.code, name: roles.name, rank: roles.rank })
        .from(roles)
        .orderBy(asc(roles.rank))
    } catch (error) {
      console.error('powerlogin roles lookup failed', error)
      return json(500, { error: 'Databasefejl ved hentning af roller' })
    }

    const token = signAdminToken({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      matchedKey: matchedKey.label
    })

    return json(200, {
      ok: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      roles: tenantRoles,
      token
    })
  } catch (error) {
    console.error('powerlogin function error', error)
    return json(500, { error: 'Internal Server Error' })
  }
}

export default handler

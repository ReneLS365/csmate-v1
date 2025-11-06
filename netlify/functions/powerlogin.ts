// netlify/functions/powerlogin.ts
import { db } from '../../src/lib/db'
import { tenants, adminKeys, roles } from '../../src/lib/schema'
import { eq, and, asc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { signAdminToken } from '../lib/auth'

const handler = async (event: any) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Body mangler' }) }
    }

    const { tenantSlug, adminKey } = JSON.parse(event.body)

    if (!tenantSlug || !adminKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'tenantSlug og adminKey kræves' }),
      }
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug))

    if (!tenant) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Tenant ikke fundet' }) }
    }

    const keys = await db
      .select({ id: adminKeys.id, label: adminKeys.label, keyHash: adminKeys.keyHash })
      .from(adminKeys)
      .where(and(eq(adminKeys.tenantId, tenant.id), eq(adminKeys.isActive, true)))

    if (!keys.length) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Ingen aktive admin keys for tenant' }),
      }
    }

    let matchedKey: { id: number; label: string } | null = null

    for (const key of keys) {
      const ok = await bcrypt.compare(adminKey, key.keyHash)
      if (ok) {
        matchedKey = { id: key.id, label: key.label }
        break
      }
    }

    if (!matchedKey) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Ugyldig admin key' }) }
    }

    const tenantRoles = await db
      .select({ id: roles.id, code: roles.code, name: roles.name, rank: roles.rank })
      .from(roles)
      .orderBy(asc(roles.rank))

    const token = signAdminToken({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      matchedKey: matchedKey.label,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        roles: tenantRoles,
        token,
      }),
      headers: { 'Content-Type': 'application/json' },
    }
  } catch (err: any) {
    console.error('powerlogin function error', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) }
  }
}

export default handler

import { db } from '../../src/lib/db'
import { tenants, userTenants, users } from '../../src/lib/schema'
import { verifyJwt } from './_auth0-verify'
import { and, eq } from 'drizzle-orm'
import { extractBearerToken } from '../lib/auth'

type JsonBody = Record<string, unknown>

type RolePayload = {
  tenantId: string
  tenantSlug: string | null
  tenantUuid: string
  role: string
}

const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const parseBody = (raw: string | null | undefined): JsonBody => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as JsonBody) : {}
  } catch (error) {
    return {}
  }
}

const ensureDefaultTenant = async () => {
  const defaultSlug = process.env.DEFAULT_TENANT_SLUG?.trim() || 'default'
  const defaultName = process.env.DEFAULT_TENANT_NAME?.trim() || 'Default Tenant'

  const [existing] = await db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.slug, defaultSlug))
    .limit(1)

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(tenants)
    .values({ slug: defaultSlug, name: defaultName })
    .returning({ id: tenants.id, slug: tenants.slug })

  if (!created) {
    throw new Error('Failed to create default tenant')
  }

  return created
}

const fetchActiveRoles = async (userId: string): Promise<RolePayload[]> => {
  const records = await db
    .select({
      tenantUuid: userTenants.tenantId,
      tenantSlug: tenants.slug,
      role: userTenants.role,
    })
    .from(userTenants)
    .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .where(and(eq(userTenants.userId, userId), eq(userTenants.isActive, true)))

  return records.map(record => ({
    tenantUuid: record.tenantUuid,
    tenantSlug: record.tenantSlug,
    tenantId: record.tenantSlug ?? record.tenantUuid,
    role: record.role,
  }))
}

const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const token = extractBearerToken(event.headers || {})
  if (!token) {
    return json(401, { error: 'Missing bearer token' })
  }

  let payload
  try {
    payload = await verifyJwt(token)
  } catch (error) {
    console.error('JWT verify failed', error)
    return json(401, { error: 'Invalid token' })
  }

  const body = parseBody(event.body)

  const sub = typeof body.sub === 'string' && body.sub.trim() ? body.sub.trim() : payload.sub
  const email =
    typeof body.email === 'string' && body.email.trim() ? body.email.trim() : payload.email
  const nameCandidate =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : typeof payload.name === 'string'
        ? payload.name
        : typeof payload.nickname === 'string'
          ? payload.nickname
          : ''

  if (!sub || typeof sub !== 'string' || !email || typeof email !== 'string') {
    return json(400, { error: 'Missing sub/email' })
  }

  const now = new Date()

  const [upserted] = await db
    .insert(users)
    .values({
      authProvider: 'auth0',
      authSub: sub,
      email,
      name: nameCandidate,
      lastLoginAt: now,
    })
    .onConflictDoUpdate({
      target: users.authSub,
      set: {
        email,
        name: nameCandidate,
        lastLoginAt: now,
      },
    })
    .returning({ id: users.id, authSub: users.authSub })

  let userRecord = upserted
  if (!userRecord) {
    const [existing] = await db
      .select({ id: users.id, authSub: users.authSub })
      .from(users)
      .where(eq(users.authSub, sub))
      .limit(1)
    userRecord = existing
  }

  if (!userRecord) {
    return json(500, { error: 'User upsert failed' })
  }

  let roles = await fetchActiveRoles(userRecord.id)

  if (roles.length === 0) {
    try {
      const defaultTenant = await ensureDefaultTenant()
      await db
        .insert(userTenants)
        .values({
          userId: userRecord.id,
          tenantId: defaultTenant.id,
          role: 'superadmin',
          isActive: true,
        })
        .onConflictDoNothing({
          target: [userTenants.userId, userTenants.tenantId],
        })
      roles = await fetchActiveRoles(userRecord.id)
    } catch (error) {
      console.error('Failed to assign default tenant', error)
      return json(500, { error: 'Failed to assign default tenant' })
    }
  }

  return json(200, {
    ok: true,
    userId: sub,
    userUuid: userRecord.id,
    roles: roles.map(role => ({ tenantId: role.tenantId, role: role.role })),
  })
}

export default handler

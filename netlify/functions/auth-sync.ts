import { db } from '../../src/lib/db.ts'
import { tenants, userTenants, users } from '../../src/lib/schema.ts'
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

const TENANT_ROLE_MAP = new Map<string, string>([
  ['owner', 'owner'],
  ['superadmin', 'owner'],
  ['tenant_admin', 'tenantAdmin'],
  ['tenantadmin', 'tenantAdmin'],
  ['tenant-admin', 'tenantAdmin'],
  ['worker', 'worker'],
])

const mapTenantRole = (role: string) => {
  if (!role) return 'worker'
  const normalized = role.trim().toLowerCase()
  return TENANT_ROLE_MAP.get(normalized) ?? 'worker'
}

const deriveGlobalRoles = (memberships: RolePayload[]) => {
  const set = new Set<string>()
  memberships.forEach(entry => {
    const role = mapTenantRole(entry.role)
    if (role === 'owner') {
      set.add('owner')
      set.add('tenantAdmin')
    } else if (role === 'tenantAdmin') {
      set.add('tenantAdmin')
    } else {
      set.add('worker')
    }
  })
  if (set.size === 0) {
    set.add('worker')
  }
  return Array.from(set)
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

  const canonicalTenants = roles.map(role => ({
    id: role.tenantUuid,
    slug: role.tenantSlug,
    role: mapTenantRole(role.role),
  }))

  return json(200, {
    ok: true,
    user: {
      id: userRecord.id,
      authId: sub,
      email,
      displayName: nameCandidate || email,
      roles: deriveGlobalRoles(roles),
      tenants: canonicalTenants,
      metadata: {
        lastLoginAt: now.toISOString(),
      },
    },
  })
}

export default handler

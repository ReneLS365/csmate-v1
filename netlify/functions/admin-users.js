import { db } from '../../src/lib/db.ts'
import { tenants, users, userTenants } from '../../src/lib/schema.ts'
import { verifyJwt } from './_auth0-verify'
import { and, asc, eq, or } from 'drizzle-orm'

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})

const TENANT_ROLE_MAP = new Map([
  ['owner', 'owner'],
  ['superadmin', 'owner'],
  ['tenant_admin', 'tenantAdmin'],
  ['tenantadmin', 'tenantAdmin'],
  ['tenant-admin', 'tenantAdmin'],
  ['worker', 'worker']
])

const CANONICAL_TO_DB_ROLE = new Map([
  ['owner', 'superadmin'],
  ['tenantAdmin', 'tenant_admin'],
  ['worker', 'worker']
])

const mapTenantRole = (role) => {
  if (!role) return 'worker'
  const normalized = String(role).trim().toLowerCase()
  return TENANT_ROLE_MAP.get(normalized) || 'worker'
}

const mapRoleForDb = (role) => {
  if (!role) return null
  const normalized = String(role).trim()
  const canonical = mapTenantRole(normalized)
  return CANONICAL_TO_DB_ROLE.get(canonical) || null
}

async function findUserIdBySub(sub) {
  if (!sub) return null
  const [record] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.authSub, sub))
    .limit(1)

  return record?.id || null
}

async function resolveTenantRecord(tenantKey) {
  const normalized = typeof tenantKey === 'string' ? tenantKey.trim() : ''
  if (!normalized) return null
  const [record] = await db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(or(eq(tenants.id, normalized), eq(tenants.slug, normalized)))
    .limit(1)
  return record || null
}

async function getCallerRoles(sub) {
  const userId = await findUserIdBySub(sub)
  if (!userId) return []

  const rows = await db
    .select({ tenantId: userTenants.tenantId, tenantSlug: tenants.slug, role: userTenants.role })
    .from(userTenants)
    .innerJoin(tenants, eq(tenants.id, userTenants.tenantId))
    .where(and(eq(userTenants.userId, userId), eq(userTenants.isActive, true)))

  return rows.map(row => ({ tenantId: row.tenantId, tenantSlug: row.tenantSlug, role: mapTenantRole(row.role) }))
}

function isAllowed(roles, tenantId, tenantSlug = '') {
  if (!Array.isArray(roles) || roles.length === 0) return false
  const normalizedId = typeof tenantId === 'string' ? tenantId : ''
  const normalizedSlug = typeof tenantSlug === 'string' ? tenantSlug : ''
  return roles.some(role => {
    if (!role) return false
    if (role.role === 'owner') return true
    const matchTenant = role.tenantId === normalizedId || (normalizedSlug && role.tenantSlug === normalizedSlug)
    return matchTenant && role.role === 'tenantAdmin'
  })
}

async function handleGet(event, callerRoles) {
  const tenantId = event.queryStringParameters?.tenantId
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    return json(400, { error: 'Missing tenantId' })
  }

  const tenantRecord = await resolveTenantRecord(tenantId)
  if (!tenantRecord) {
    return json(404, { error: 'Tenant not found' })
  }

  if (!isAllowed(callerRoles, tenantRecord.id, tenantRecord.slug)) {
    return json(403, { error: 'Forbidden' })
  }

  const rows = await db
    .select({
      userId: userTenants.userId,
      email: users.email,
      name: users.name,
      role: userTenants.role
    })
    .from(userTenants)
    .innerJoin(users, eq(users.id, userTenants.userId))
    .where(and(eq(userTenants.tenantId, tenantRecord.id), eq(userTenants.isActive, true)))
    .orderBy(asc(users.email))

  const usersPayload = rows.map(row => {
    const canonicalRole = mapTenantRole(row.role)
    const roles = canonicalRole === 'owner' ? ['owner', 'tenantAdmin'] : [canonicalRole]
    return {
      id: row.userId,
      email: row.email,
      displayName: row.name || row.email,
      roles,
      tenants: [
        {
          id: tenantRecord.id,
          slug: tenantRecord.slug,
          role: canonicalRole,
        },
      ],
    }
  })

  return json(200, { users: usersPayload })
}

const ASSIGNABLE_ROLES = new Set(['worker', 'tenantAdmin'])

const callerHasSuperadminRole = (roles) =>
  Array.isArray(roles) && roles.some(role => role?.role === 'owner')

async function handlePost(event, callerRoles) {
  let body
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch (error) {
    return json(400, { error: 'Invalid JSON body' })
  }

  const tenantKey = typeof body.tenantId === 'string' ? body.tenantId.trim() : ''
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const requestedRole = typeof body.role === 'string' ? body.role.trim() : ''
  const canonicalRole = mapTenantRole(requestedRole)

  if (!tenantKey || !userId || !canonicalRole) {
    return json(400, { error: 'Missing tenantId/userId/role' })
  }

  const tenantRecord = await resolveTenantRecord(tenantKey)
  if (!tenantRecord) {
    return json(404, { error: 'Tenant not found' })
  }

  if (!isAllowed(callerRoles, tenantRecord.id, tenantRecord.slug)) {
    return json(403, { error: 'Forbidden' })
  }

  if (!ASSIGNABLE_ROLES.has(canonicalRole)) {
    return json(400, { error: 'Unsupported role' })
  }

  if (canonicalRole === 'owner' && !callerHasSuperadminRole(callerRoles)) {
    return json(403, { error: 'Forbidden role escalation' })
  }

  const dbRole = mapRoleForDb(canonicalRole)
  if (!dbRole) {
    return json(400, { error: 'Unsupported role' })
  }

  await db
    .insert(userTenants)
    .values({
      userId,
      tenantId: tenantRecord.id,
      role: dbRole,
      isActive: true
    })
    .onConflictDoUpdate({
      target: [userTenants.userId, userTenants.tenantId],
      set: {
        role: dbRole,
        isActive: true
      }
    })

  const [updated] = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: userTenants.role,
    })
    .from(users)
    .innerJoin(userTenants, and(eq(userTenants.userId, users.id), eq(userTenants.tenantId, tenantRecord.id)))
    .where(eq(users.id, userId))
    .limit(1)

  const responseUser = updated
    ? {
        id: updated.userId,
        email: updated.email,
        displayName: updated.name || updated.email,
        roles: canonicalRole === 'owner' ? ['owner', 'tenantAdmin'] : [canonicalRole],
        tenants: [
          {
            id: tenantRecord?.id || tenantKey,
            slug: tenantRecord?.slug || null,
            role: canonicalRole,
          },
        ],
      }
    : null

  return json(200, { ok: true, user: responseUser })
}

export const handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return json(401, { error: 'Missing bearer token' })
  }

  const token = authHeader.replace('Bearer ', '').trim()
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

  const callerSub = typeof payload?.sub === 'string' ? payload.sub : ''
  if (!callerSub) {
    return json(401, { error: 'Invalid token payload' })
  }

  const callerRoles = await getCallerRoles(callerSub)

  if (event.httpMethod === 'GET') {
    return handleGet(event, callerRoles)
  }

  if (event.httpMethod === 'POST') {
    return handlePost(event, callerRoles)
  }

  return json(405, { error: 'Method not allowed' })
}

export default handler

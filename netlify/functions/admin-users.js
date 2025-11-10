import { db } from '../../src/lib/db'
import { users, userTenants } from '../../src/lib/schema'
import { verifyJwt } from './_auth0-verify'
import { and, asc, eq } from 'drizzle-orm'

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})

async function findUserIdBySub(sub) {
  if (!sub) return null
  const [record] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.authSub, sub))
    .limit(1)

  return record?.id || null
}

async function getCallerRoles(sub) {
  const userId = await findUserIdBySub(sub)
  if (!userId) return []

  const rows = await db
    .select({ tenantId: userTenants.tenantId, role: userTenants.role })
    .from(userTenants)
    .where(and(eq(userTenants.userId, userId), eq(userTenants.isActive, true)))

  return rows.map(row => ({ tenantId: row.tenantId, role: row.role }))
}

function isAllowed(roles, tenantId) {
  if (!Array.isArray(roles) || roles.length === 0) return false
  return roles.some(role => role.role === 'superadmin' || (role.tenantId === tenantId && role.role === 'tenant_admin'))
}

async function handleGet(event, callerRoles) {
  const tenantId = event.queryStringParameters?.tenantId
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    return json(400, { error: 'Missing tenantId' })
  }

  const normalizedTenantId = tenantId.trim()

  if (!isAllowed(callerRoles, normalizedTenantId)) {
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
    .where(and(eq(userTenants.tenantId, normalizedTenantId), eq(userTenants.isActive, true)))
    .orderBy(asc(users.email))

  return json(200, { users: rows })
}

const ASSIGNABLE_ROLES = new Set(['worker', 'tenant_admin', 'superadmin'])

const callerHasSuperadminRole = (roles) =>
  Array.isArray(roles) && roles.some(role => role?.role === 'superadmin')

async function handlePost(event, callerRoles) {
  let body
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch (error) {
    return json(400, { error: 'Invalid JSON body' })
  }

  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : ''
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const role = typeof body.role === 'string' ? body.role.trim() : ''

  if (!tenantId || !userId || !role) {
    return json(400, { error: 'Missing tenantId/userId/role' })
  }

  if (!isAllowed(callerRoles, tenantId)) {
    return json(403, { error: 'Forbidden' })
  }

  if (!ASSIGNABLE_ROLES.has(role)) {
    return json(400, { error: 'Unsupported role' })
  }

  if (role === 'superadmin' && !callerHasSuperadminRole(callerRoles)) {
    return json(403, { error: 'Forbidden role escalation' })
  }

  await db
    .insert(userTenants)
    .values({
      userId,
      tenantId,
      role,
      isActive: true
    })
    .onConflictDoUpdate({
      target: [userTenants.userId, userTenants.tenantId],
      set: {
        role,
        isActive: true
      }
    })

  return json(200, { ok: true })
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

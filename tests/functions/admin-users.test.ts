import { beforeEach, describe, expect, test, vi } from 'vitest'
import handler from '../../netlify/functions/admin-users'
import { tenants, users, userTenants } from '../../src/lib/schema'

const { verifyJwtMock } = vi.hoisted(() => ({ verifyJwtMock: vi.fn() }))

vi.mock('../../netlify/functions/_auth0-verify', () => ({
  verifyJwt: verifyJwtMock
}))

const { selectMock, insertMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn()
}))

vi.mock('../../src/lib/db.ts', () => ({
  db: {
    select: selectMock,
    insert: insertMock
  }
}))

const selectBuilder = (handlers: (() => any)[]) => {
  let callIndex = 0
  return () => {
    const handler = handlers[callIndex] || handlers[handlers.length - 1]
    callIndex += 1
    return handler()
  }
}

beforeEach(() => {
  verifyJwtMock.mockReset()
  selectMock.mockReset()
  insertMock.mockReset()
})

describe('admin-users handler', () => {
  test('returns list of users for authorized admin', async () => {
    verifyJwtMock.mockResolvedValue({ sub: 'auth0|caller' })

    selectMock.mockImplementation(selectBuilder([
      // findUserIdBySub
      () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'caller-uuid' }]
          })
        })
      }),
      // getCallerRoles
      () => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => ([{
              tenantId: 'tenant-1',
              tenantSlug: 'default',
              role: 'superadmin'
            }])
          })
        })
      }),
      // resolveTenantRecord
      () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'tenant-1', slug: 'default' }]
          })
        })
      }),
      // fetch users for tenant
      () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: async () => ([{
                userId: 'user-1',
                email: 'member@example.com',
                name: 'Member',
                role: 'tenant_admin'
              }])
            })
          })
        })
      })
    ]))

    const event = {
      httpMethod: 'GET',
      headers: { authorization: 'Bearer token' },
      queryStringParameters: { tenantId: 'tenant-1' }
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(Array.isArray(body.users)).toBe(true)
    expect(body.users[0]).toMatchObject({
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member',
      tenants: [
        { id: 'tenant-1', slug: 'default', role: 'tenantAdmin' }
      ]
    })
  })

  test('updates tenant role via POST', async () => {
    verifyJwtMock.mockResolvedValue({ sub: 'auth0|caller' })

    insertMock.mockImplementation(() => ({
      values() { return this },
      onConflictDoUpdate() { return this },
      returning: async () => []
    }))

    selectMock.mockImplementation(selectBuilder([
      // findUserIdBySub
      () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ id: 'caller-uuid' }] })
        })
      }),
      // getCallerRoles
      () => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => ([{ tenantId: 'tenant-1', tenantSlug: 'default', role: 'superadmin' }])
          })
        })
      }),
      // resolveTenantRecord
      () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ id: 'tenant-1', slug: 'default' }] })
        })
      }),
      // select updated user
      () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: async () => [{
                userId: 'user-2',
                email: 'target@example.com',
                name: 'Target User',
                role: 'tenant_admin'
              }]
            })
          })
        })
      })
    ]))

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ tenantId: 'tenant-1', userId: 'user-2', role: 'tenantAdmin' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.ok).toBe(true)
    expect(body.user).toMatchObject({
      id: 'user-2',
      email: 'target@example.com',
      tenants: [{ id: 'tenant-1', role: 'tenantAdmin' }]
    })
  })

  test('blocks non-admin callers', async () => {
    verifyJwtMock.mockResolvedValue({ sub: 'auth0|caller' })

    selectMock.mockImplementation(selectBuilder([
      () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ id: 'caller-uuid' }] })
        })
      }),
      () => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => ([])
          })
        })
      }),
      () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ id: 'tenant-1', slug: 'default' }] })
        })
      })
    ]))

    const event = {
      httpMethod: 'GET',
      headers: { authorization: 'Bearer token' },
      queryStringParameters: { tenantId: 'tenant-1' }
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(403)
  })
})

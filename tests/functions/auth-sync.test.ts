import { describe, expect, test, beforeEach, vi } from 'vitest'
import handler from '../../netlify/functions/auth-sync'
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

const applySelectImplementation = () => {
  selectMock.mockImplementation((columns: Record<string, unknown>) => {
    const provideWhereLimit = (rows: unknown[]) => ({
      from: () => ({
        where: () => ({
          limit: async () => rows
        }),
        innerJoin: () => ({
          where: async () => rows
        })
      })
    })

    // user lookup by authSub
    if ('authSub' in columns) {
      return provideWhereLimit([{ id: 'user-1', authSub: 'auth0|abc' }])
    }

    // tenant memberships join
    if ('tenantUuid' in columns) {
      return {
        from: () => ({
          innerJoin: () => ({
            where: async () => ([
              { tenantUuid: 'tenant-1', tenantSlug: 'default', role: 'tenant_admin' }
            ])
          })
        })
      }
    }

    // tenant lookup by slug/id
    if ('slug' in columns) {
      return provideWhereLimit([{ id: 'tenant-1', slug: 'default' }])
    }

    return provideWhereLimit([])
  })
}

applySelectImplementation()

beforeEach(() => {
  verifyJwtMock.mockReset()
  selectMock.mockReset()
  insertMock.mockReset()
  applySelectImplementation()
})

describe('auth-sync handler', () => {
  test('returns user profile with canonical roles on success', async () => {
    verifyJwtMock.mockResolvedValue({ sub: 'auth0|abc', email: 'admin@example.com', name: 'Admin' })

    let insertCall = 0
    insertMock.mockImplementation(() => ({
      values() {
        return this
      },
      onConflictDoUpdate() {
        return this
      },
      onConflictDoNothing() {
        return this
      },
      returning: async () => {
        const result = insertCall === 0 ? [{ id: 'user-1', authSub: 'auth0|abc' }] : []
        insertCall += 1
        return result
      }
    }))

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token-123' },
      body: JSON.stringify({ sub: 'auth0|abc', email: 'admin@example.com', name: 'Admin' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.ok).toBe(true)
    expect(body.user).toMatchObject({
      id: 'user-1',
      email: 'admin@example.com',
      roles: expect.arrayContaining(['tenantAdmin']),
      tenants: [
        {
          id: 'tenant-1',
          slug: 'default',
          role: 'tenantAdmin'
        }
      ]
    })
  })

  test('rejects requests with invalid tokens', async () => {
    verifyJwtMock.mockRejectedValue(new Error('invalid token'))

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer bad' },
      body: JSON.stringify({})
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body)).toHaveProperty('error')
  })
})

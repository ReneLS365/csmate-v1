import { beforeEach, describe, expect, test, vi } from 'vitest'
import handler from '../../netlify/functions/powerlogin'

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }))

vi.mock('../../src/lib/db.ts', () => ({
  db: {
    select: selectMock
  }
}))

const { compareMock } = vi.hoisted(() => ({ compareMock: vi.fn() }))

vi.mock('bcryptjs', () => ({
  default: { compare: compareMock },
  compare: compareMock
}))

const { signTokenMock } = vi.hoisted(() => ({ signTokenMock: vi.fn() }))

vi.mock('../../netlify/lib/auth', () => ({
  signAdminToken: signTokenMock
}))

const tenantBuilder = (tenant: any) => () => ({
  from: () => ({
    where: () => ({ limit: () => (tenant ? [tenant] : []) })
  })
})

const keysBuilder = (keys: any[]) => () => ({
  from: () => ({
    where: () => keys
  })
})

const rolesBuilder = (rows: any[]) => () => ({
  from: () => ({
    orderBy: () => rows
  })
})

beforeEach(() => {
  selectMock.mockReset()
  compareMock.mockReset()
  signTokenMock.mockReset()
  signTokenMock.mockReturnValue('signed-token')
})

describe('powerlogin function', () => {
  test('returnerer token for gyldig admin key', async () => {
    selectMock
      .mockImplementationOnce(tenantBuilder({ id: 'tenant-1', slug: 'tenant-1', name: 'Tenant' }))
      .mockImplementationOnce(keysBuilder([{ id: 1, label: 'primary', keyHash: 'hash' }]))
      .mockImplementationOnce(rolesBuilder([{ id: 1, code: 'role', name: 'Role', rank: 1 }]))
    compareMock.mockResolvedValue(true)

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ tenantSlug: 'tenant-1', adminKey: 'secret' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.token).toBe('signed-token')
    expect(body.roles).toHaveLength(1)
  })

  test('validerer manglende felter', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ tenantSlug: 'tenant-1' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.details).toContain('adminKey kræves')
  })

  test('afviser ugyldig admin key', async () => {
    selectMock
      .mockImplementationOnce(tenantBuilder({ id: 'tenant-1', slug: 'tenant-1', name: 'Tenant' }))
      .mockImplementationOnce(keysBuilder([{ id: 1, label: 'primary', keyHash: 'hash' }]))
      .mockImplementationOnce(rolesBuilder([{ id: 1, code: 'role', name: 'Role', rank: 1 }]))
    compareMock.mockResolvedValue(false)

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ tenantSlug: 'tenant-1', adminKey: 'wrong' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error).toMatch(/Ugyldig admin key/)
  })

  test('håndterer databasefejl', async () => {
    selectMock.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({ limit: () => { throw new Error('db down') } })
      })
    }))

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ tenantSlug: 'tenant-1', adminKey: 'secret' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.error).toMatch(/Databasefejl/)
  })
})

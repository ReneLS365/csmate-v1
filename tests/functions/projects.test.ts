import { beforeEach, describe, expect, test, vi } from 'vitest'
import handler from '../../netlify/functions/projects'

const { extractTokenMock, verifyTokenMock } = vi.hoisted(() => ({
  extractTokenMock: vi.fn(),
  verifyTokenMock: vi.fn()
}))

vi.mock('../../netlify/lib/auth', () => ({
  extractBearerToken: extractTokenMock,
  verifyAdminToken: verifyTokenMock
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

const selectBuilder = (rows: any[]) => () => ({
  from: () => ({
    where: () => rows
  })
})

const insertBuilder = (rows: any[] | Error) => () => ({
  values: () => ({
    returning: async () => {
      if (rows instanceof Error) throw rows
      return rows
    }
  })
})

beforeEach(() => {
  extractTokenMock.mockReset()
  verifyTokenMock.mockReset()
  selectMock.mockReset()
  insertMock.mockReset()
  extractTokenMock.mockReturnValue('token')
  verifyTokenMock.mockReturnValue({ tenantId: 'tenant-1' })
})

describe('projects function', () => {
  test('returnerer projekter for autoriseret tenant', async () => {
    selectMock.mockImplementation(selectBuilder([
      { id: 'p1', tenantId: 'tenant-1', code: 'ABC', name: 'Projekt' }
    ]))

    const event = {
      httpMethod: 'GET',
      headers: { authorization: 'Bearer token' },
      queryStringParameters: { tenantId: 'tenant-1' }
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ id: 'p1', code: 'ABC' })
  })

  test('validerer payload ved oprettelse', async () => {
    insertMock.mockImplementation(insertBuilder([{ id: 'p2' }]))

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ tenantId: 'tenant-1', name: 'Uden kode' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.details).toContain('code kræves')
    expect(insertMock).not.toHaveBeenCalled()
  })

  test('håndterer databasefejl ved insert', async () => {
    insertMock.mockImplementation(insertBuilder(new Error('db down')))

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ tenantId: 'tenant-1', code: 'A', name: 'Projekt' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.error).toMatch(/Databasefejl/)
  })
})

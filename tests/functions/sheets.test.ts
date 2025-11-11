import { beforeEach, describe, expect, test, vi } from 'vitest'
import handler from '../../netlify/functions/sheets'

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

const selectBuilder = (rows: any[], options: { withLimit?: boolean } = {}) => () => ({
  from: () => ({
    where: () => options.withLimit ? ({ limit: () => rows }) : rows
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

describe('sheets function', () => {
  test('GET returnerer ark for projekt', async () => {
    selectMock
      .mockImplementationOnce(selectBuilder([{ tenantId: 'tenant-1' }], { withLimit: true }))
      .mockImplementationOnce(selectBuilder([{ id: 'sheet-1', projectId: 'proj-1' }]))

    const event = {
      httpMethod: 'GET',
      headers: { authorization: 'Bearer token' },
      queryStringParameters: { projectId: 'proj-1' }
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ id: 'sheet-1' })
  })

  test('POST validerer obligatoriske felter', async () => {
    selectMock.mockImplementationOnce(selectBuilder([{ tenantId: 'tenant-1' }], { withLimit: true }))
    insertMock.mockImplementation(insertBuilder([{ id: 'sheet-2' }]))

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ tenantId: 'tenant-1', projectId: 'proj-1' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.details).toContain('sheetNo kræves')
    expect(insertMock).not.toHaveBeenCalled()
  })

  test('POST håndterer databasefejl ved insert', async () => {
    selectMock.mockImplementationOnce(selectBuilder([{ tenantId: 'tenant-1' }], { withLimit: true }))
    insertMock.mockImplementation(insertBuilder(new Error('db failure')))

    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ tenantId: 'tenant-1', projectId: 'proj-1', sheetNo: '1' })
    }

    const response = await handler(event as any)
    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.error).toMatch(/Databasefejl/)
  })
})

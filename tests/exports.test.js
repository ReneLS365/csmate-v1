import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as Exports from '../app/src/exports.js'

const {
  buildMaterialCSV,
  buildLønCSV,
  buildEkompletCSV,
  exportSingleSheet,
  registerEkompletEngine,
  registerPDFEngine,
  requireSagsinfo,
  ts
} = Exports

const anchors = []

beforeEach(() => {
  registerEkompletEngine(null)
  registerPDFEngine(async () => new Blob(['PDF']))
  anchors.length = 0
  const anchorFactory = () => {
    const anchor = {
      href: '',
      download: '',
      click: vi.fn()
    }
    anchors.push(anchor)
    return anchor
  }
  vi.stubGlobal('document', {
    createElement: vi.fn(anchorFactory)
  })
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:url'),
    revokeObjectURL: vi.fn()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exports helpers', () => {
  test('buildMaterialCSV serialiserer materialer med totals', async () => {
    const job = {
      id: 'job-1',
      systems: [
        {
          name: 'BOSTA',
          materialer: [
            { navn: 'Rør', antal: 5, pris: 10 },
            { navn: 'Bøjle', antal: 2, pris: 4.5 }
          ]
        }
      ]
    }

    const blob = buildMaterialCSV(job)
    const text = await blob.text()
    expect(text).toContain('"BOSTA","Rør","5","10","50.00"')
    expect(text).toContain('"Bøjle","2","4.5","9.00"')
  })

  test('buildLønCSV serialiserer lønkolonner', async () => {
    const job = {
      systems: [
        {
          name: 'HAKI',
          loen: {
            timer: 12,
            km: 4,
            tillaegPct: 7,
            montage: 1200,
            demontage: 600,
            sum: 1800
          }
        }
      ]
    }

    const blob = buildLønCSV(job)
    const text = await blob.text()
    expect(text).toContain('"HAKI","12","4","7","1200","600","1800"')
  })

  test('buildEkompletCSV bruger registreret engine', async () => {
    registerEkompletEngine(() => 'header\nrow')
    const blob = await buildEkompletCSV({ id: 'job-42' })
    expect(await blob.text()).toBe('header\nrow')
  })

  test('exportSingleSheet trigger download for valgt system', async () => {
    registerEkompletEngine(() => 'csv')
    const downloadSpy = vi.spyOn(Exports, 'downloadBlob').mockImplementation(() => {})

    const job = {
      id: 'job-2',
      systems: [
        {
          name: 'MODEX',
          materialer: [
            { navn: 'Dæk', antal: 3, pris: 25 }
          ]
        }
      ]
    }

    await exportSingleSheet(job, 'MODEX')

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(anchors.length).toBeGreaterThanOrEqual(2)
    anchors.forEach(anchor => {
      expect(anchor.click).toHaveBeenCalled()
    })
  })

  test('requireSagsinfo kræver kunde, adresse og sagsnummer', () => {
    expect(requireSagsinfo({ sagsinfo: { kunde: 'A', adresse: 'B', sagsnr: '1' } })).toBe(true)
    expect(requireSagsinfo({ sagsinfo: { kunde: 'A', adresse: 'B' } })).toBe(false)
  })

  test('ts returnerer formateret tidsstempel', () => {
    const stamp = ts('YYYY-MM-DD')
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

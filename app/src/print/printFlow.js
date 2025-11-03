import { buildPrintableDataForSystem } from './dataMapping.js'
import { renderTemplate } from './placeholderRenderer.js'
import { loadTemplate } from './templateLoader.js'

const KNOWN_SYSTEMS = ['bosta', 'haki', 'modex', 'alfix']
const PRINT_DELAY_MS = 250

export class PopupBlockedError extends Error {
  constructor (message = 'Popup blev blokeret') {
    super(message)
    this.name = 'PopupBlockedError'
    this.code = 'POPUP_BLOCKED'
  }
}

function uniqueSystems (systems) {
  const seen = new Set()
  const ordered = []
  ;(Array.isArray(systems) ? systems : []).forEach(system => {
    const key = String(system || '').toLowerCase()
    if (!KNOWN_SYSTEMS.includes(key)) return
    if (seen.has(key)) return
    seen.add(key)
    ordered.push(key)
  })
  return ordered
}

function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function writeAndPrint (system) {
  if (typeof window === 'undefined') {
    throw new Error('Print kræver et browsermiljø')
  }
  const popup = window.open('', '_blank')
  if (!popup) {
    throw new PopupBlockedError()
  }

  try {
    const [template, data] = await Promise.all([
      loadTemplate(system),
      Promise.resolve(buildPrintableDataForSystem(system))
    ])
    const markup = renderTemplate(template, data)
    popup.document.open()
    popup.document.write(markup)
    popup.document.close()
    await delay(PRINT_DELAY_MS)
    if (typeof popup.focus === 'function') {
      popup.focus()
    }
    if (typeof popup.print === 'function') {
      popup.print()
    }
  } catch (error) {
    try {
      popup.close()
    } catch (err) {
      console.debug('Kunne ikke lukke popup', err)
    }
    throw error
  }
}

export async function printAkkordsedlerFor (systems) {
  const ordered = uniqueSystems(systems)
  if (!ordered.length) return
  for (const system of ordered) {
    await writeAndPrint(system)
  }
}

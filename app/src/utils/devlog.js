const SAMPLE_KEY = 'csmate:perf:numpad:samples'

const isBrowser = typeof window !== 'undefined'
const navUA = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
const processEnv = typeof process !== 'undefined' ? process.env || {} : {}

const automationUARegex = /jsdom|playwright|headless|puppeteer|selenium|cypress/i
const isAutomationUA = automationUARegex.test(navUA)

const isTestEnv = Boolean(processEnv.VITEST || processEnv.NODE_ENV === 'test' || isAutomationUA)

function hasDevFlag () {
  if (!isBrowser) return false
  try {
    const { location, localStorage, sessionStorage } = window
    const search = typeof location?.search === 'string' ? location.search : ''
    if (/([?&])devlog=1(?!\d)/.test(search)) return true

    const hostname = location?.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Treat localhost as dev unless automation hints it is a test run
      if (!isAutomationUA) return true
    }

    const localFlag = localStorage?.getItem('csmate:dev-logging')
    if (localFlag === '1' || localFlag === 'true') return true

    const sessionFlag = sessionStorage?.getItem('csmate:dev-logging')
    if (sessionFlag === '1' || sessionFlag === 'true') return true
  } catch {
    // ignore storage access errors
  }
  return false
}

export const devlog = (() => {
  const timers = new Map()
  const isDev = !isTestEnv && hasDevFlag()

  function safeNow () {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now()
    }
    return Date.now()
  }

  function pushSample (name, ms) {
    if (!isDev) return
    if (!Number.isFinite(ms)) return
    try {
      const store = window?.sessionStorage
      if (!store) return
      const raw = store.getItem(SAMPLE_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      const list = Array.isArray(parsed[name]) ? parsed[name] : []
      list.push(ms)
      if (list.length >= 10) {
        const total = list.reduce((sum, value) => sum + value, 0)
        const avg = total / list.length
        console.info(`[perf][${name}] avg over ${list.length} = ${avg.toFixed(1)} ms`)
        parsed[name] = []
      } else {
        parsed[name] = list
      }
      store.setItem(SAMPLE_KEY, JSON.stringify(parsed))
    } catch {
      // ignore storage failures
    }
  }

  function time (label) {
    if (!isDev) return
    timers.set(label, safeNow())
    try {
      console.time?.(label)
    } catch {
      // ignore console errors
    }
  }

  function timeEnd (label) {
    if (!isDev) return 0
    const start = timers.get(label)
    const now = safeNow()
    timers.delete(label)
    try {
      console.timeEnd?.(label)
    } catch {
      // ignore console errors
    }
    const duration = typeof start === 'number' ? now - start : 0
    pushSample(label, duration)
    return duration
  }

  function mark (name) {
    if (!isDev) return
    try {
      performance.mark?.(name)
    } catch {
      // ignore mark errors
    }
  }

  function measure (name, startMark, endMark) {
    if (!isDev) return 0
    if (typeof performance === 'undefined' || typeof performance.measure !== 'function') return 0
    try {
      performance.measure(name, startMark, endMark)
      const entries = typeof performance.getEntriesByName === 'function'
        ? performance.getEntriesByName(name)
        : []
      const last = entries.length > 0 ? entries[entries.length - 1] : null
      const duration = last?.duration ?? 0
      pushSample(name, duration)
      return duration
    } catch {
      return 0
    }
  }

  function warnIfSlow (name, ms, threshold = 50) {
    if (!isDev) return
    if (!Number.isFinite(ms)) return
    if (ms > threshold) {
      try {
        console.warn?.(`[perf][slow] ${name}: ${ms.toFixed(1)} ms (> ${threshold} ms)`)
      } catch {
        // ignore console errors
      }
    }
  }

  return {
    isDev,
    time,
    timeEnd,
    mark,
    measure,
    warnIfSlow,
    pushSample (name, ms) {
      if (!isDev) return
      pushSample(name, ms)
    }
  }
})()

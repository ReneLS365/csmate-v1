// /src/features/pctcalc/pctcalc.js
(() => {
  const STYLE_ID = 'pctcalc-style'
  const STYLE_HREF = 'src/features/pctcalc/pctcalc.css'
  const CALC_URL = 'https://gleeful-faun-12d319.netlify.app/'

  const scheduleIdle = (task) => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => task(), { timeout: 1500 })
    } else {
      window.setTimeout(task, 0)
    }
  }

  const whenReady = (task) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', task, { once: true })
    } else {
      task()
    }
  }

  function ensureStylesheet () {
    const existing = document.getElementById(STYLE_ID)
    if (existing) return existing

    const link = document.createElement('link')
    link.id = STYLE_ID
    link.rel = 'stylesheet'
    link.href = STYLE_HREF
    document.head.appendChild(link)
    return link
  }

  function hasSlaebKeyword (input) {
    const text = (input || '').trim().toLowerCase()
    if (!text) return false

    if (
      text.includes('slæbeprocent') ||
      text.includes('slæbeprocenter') ||
      text.includes('slæb i %') ||
      text.includes('slæb i%')
    ) {
      return true
    }

    const normalized = text.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return (
      normalized.includes('slaebeprocent') ||
      normalized.includes('slaebeprocenter') ||
      normalized.includes('slaeb i %') ||
      normalized.includes('slaeb i%') ||
      normalized.includes('slaeb i pct')
    )
  }

  function findMountPoint () {
    let el = document.querySelector('[data-slaebepct-tools]')
    if (el) return el

    el = document.querySelector(
      '#slaebePct, #slaebPct, [name="slaebePct"], [name="slaebPct"], [data-field="slaebePct"], [data-field="slaebPct"]'
    )
    if (el) {
      const wrapper = document.createElement('span')
      wrapper.className = 'pctcalc-inline-tools'
      el.insertAdjacentElement('afterend', wrapper)
      return wrapper
    }

    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,label,legend,span,div'))
    const head = candidates.find(n => hasSlaebKeyword(n.textContent || ''))
    if (head) {
      const wrapper = document.createElement('span')
      wrapper.className = 'pctcalc-inline-tools'
      head.insertAdjacentElement('beforeend', wrapper)
      return wrapper
    }

    return null
  }

  function makeButton () {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'pctcalc-btn'
    btn.setAttribute('aria-label', 'Åbn procent-lommeregner')
    btn.title = 'Åbn lommeregner'
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 3h10v4H7V6zm0 6h4v2H7v-2zm6 0h4v2h-4v-2zm-6 4h4v2H7v-2zm6 0h4v2h-4v-2z"/>
      </svg>
      <span>Lommeregner</span>
    `
    btn.addEventListener('click', e => {
      e.preventDefault()
      openModalOrTab()
    })
    return btn
  }

  function renderModal () {
    const modal = document.createElement('div')
    modal.className = 'pctcalc-modal'
    modal.id = 'pctcalc-modal'
    modal.hidden = true
    modal.innerHTML = `
      <div class="pctcalc-backdrop" data-close="1"></div>
      <div class="pctcalc-body" role="dialog" aria-modal="true" aria-label="Procent-lommeregner">
        <button class="pctcalc-close" type="button" aria-label="Luk">✕</button>
        <iframe class="pctcalc-frame" title="Procent-lommeregner"
          src="${CALC_URL}" referrerpolicy="no-referrer" loading="lazy"></iframe>
      </div>
    `
    document.body.appendChild(modal)

    modal.addEventListener('click', ev => {
      if (ev.target && ev.target.getAttribute('data-close') === '1') closeModal()
    })
    modal.querySelector('.pctcalc-close')?.addEventListener('click', closeModal)
    document.addEventListener('keydown', escHandler)

    function escHandler (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal()
    }
    function closeModal () {
      modal.hidden = true
    }

    return {
      open () {
        modal.hidden = false
        setTimeout(() => modal.querySelector('iframe')?.focus(), 50)
      },
      close: closeModal
    }
  }

  let modalCtrl = null

  function openModalOrTab () {
    if (!modalCtrl) {
      modalCtrl = renderModal()
    }
    try {
      modalCtrl.open()
    } catch {
      window.open(CALC_URL, '_blank', 'noopener,noreferrer')
    }
  }

  function mount () {
    const mountPoint = findMountPoint()
    if (mountPoint && !mountPoint.querySelector('.pctcalc-btn')) {
      mountPoint.appendChild(makeButton())
      return true
    }
    return false
  }

  function initFeature () {
    if (window.__pctcalcMounted) return
    window.__pctcalcMounted = true

    ensureStylesheet()
    mount()
  }

  scheduleIdle(() => whenReady(initFeature))
})()

export function mountDevIfHash () {
  if (location.hash !== '#dev') return
  const host = document.getElementById('tab-help')
  if (!host) return
  if (host.querySelector('#dev')) return

  const section = document.createElement('section')
  section.id = 'dev'
  section.innerHTML = `
    <h2>/dev</h2>
    <div class="grid two">
      <div>
        <h3>Meta</h3>
        <ul>
          <li>App-version: <code id="meta-appver"></code></li>
          <li>SW-version: <code id="meta-swver"></code></li>
          <li>Template: <code id="meta-template"></code></li>
          <li>UA: <code id="meta-ua"></code></li>
          <li>Viewport: <code id="meta-vp"></code></li>
          <li>Storage: <code id="meta-storage"></code></li>
        </ul>
        <button id="btn-dev-health" class="btn">Kør health-check</button>
        <ul id="health-list"></ul>
      </div>
      <div>
        <h3>Seneste handlinger</h3>
        <pre id="audit-view" style="max-height:300px;overflow:auto;"></pre>
      </div>
    </div>
  `
  host.append(section)

  const appVer = window.APP_VERSION || '0.0.0'
  const templateMeta = window.TemplateStore?.activeMeta?.()
  const auditTail = window.AuditLog?.tail?.(50) || []
  const backupTs = (() => {
    try {
      return localStorage.getItem('csmate.backup.ts') || '-'
    } catch (error) {
      console.warn('Dev panel could not read backup timestamp', error)
      return '-'
    }
  })()

  document.getElementById('meta-appver').textContent = appVer
  document.getElementById('meta-template').textContent = templateMeta?.name || 'ukendt'
  document.getElementById('meta-ua').textContent = navigator.userAgent
  document.getElementById('meta-vp').textContent = `${window.innerWidth}x${window.innerHeight}`
  document.getElementById('meta-storage').textContent = `jobs=${window.JobStore?.count?.() || 0}, backup=${backupTs}`

  fetch('service-worker.js', { cache: 'no-store' })
    .then(response => response.text())
    .then(text => {
      const match = text.match(/SW_VERSION\s*=\s*['"]([^'"]+)['"]/)
      document.getElementById('meta-swver').textContent = match?.[1] || 'ukendt'
    })
    .catch(error => {
      console.warn('Dev panel could not read SW version', error)
      document.getElementById('meta-swver').textContent = 'ukendt'
    })

  document.getElementById('audit-view').textContent = JSON.stringify(auditTail, null, 2)

  document.getElementById('btn-dev-health').addEventListener('click', () => {
    const list = document.getElementById('health-list')
    list.innerHTML = ''
    const add = (label, ok) => {
      const li = document.createElement('li')
      li.textContent = `${ok ? '✅' : '❌'} ${label}`
      list.append(li)
    }

    try {
      const id = window.JobStore?.create?.({ navn: '_dev_test' })
      if (id) {
        window.JobStore?.delete?.(id)
        add('JobStore write', true)
      } else {
        add('JobStore write', false)
      }
    } catch (error) {
      console.warn('Dev panel JobStore test failed', error)
      add('JobStore write', false)
    }

    try {
      const tMeta = window.TemplateStore?.activeMeta?.()
      add('Template load', Boolean(tMeta))
    } catch (error) {
      console.warn('Dev panel template test failed', error)
      add('Template load', false)
    }

    try {
      add('Beregning baseline', window.Calc?.test?.() === true)
    } catch (error) {
      console.warn('Dev panel calc test failed', error)
      add('Beregning baseline', false)
    }
  })
}

window.addEventListener('hashchange', () => {
  if (location.hash === '#dev') {
    location.reload()
  }
})

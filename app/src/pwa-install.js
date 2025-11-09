const IOS_INSTALL_PROMPT_DISMISSED_KEY = 'csmate.iosInstallPromptDismissed'
let deferredPrompt = null

function hideInstallButton (button) {
  if (!button) return
  button.style.display = 'none'
  button.setAttribute('hidden', '')
  button.disabled = false
}

function showInstallButton (button) {
  if (!button) return
  button.removeAttribute('hidden')
  button.style.display = 'inline-flex'
  button.disabled = false
}

function hasDismissedIOSPrompt () {
  try {
    return window.localStorage?.getItem(IOS_INSTALL_PROMPT_DISMISSED_KEY) === '1'
  } catch (error) {
    console.warn('Kunne ikke læse iOS prompt flag', error)
    return false
  }
}

function hideIOSHint (persist) {
  const iosBanner = document.getElementById('iosInstallPrompt')
  if (!iosBanner) return
  iosBanner.setAttribute('hidden', '')
  if (persist) {
    try {
      window.localStorage?.setItem(IOS_INSTALL_PROMPT_DISMISSED_KEY, '1')
    } catch (error) {
      console.warn('Kunne ikke gemme iOS prompt flag', error)
    }
  }
}

function maybeShowIOSHint () {
  const iosBanner = document.getElementById('iosInstallPrompt')
  if (!iosBanner) return

  const userAgent = navigator.userAgent || ''
  const isiOS = /iphone|ipad|ipod/i.test(userAgent)
  const isSafari = /safari/i.test(userAgent) && !/(crios|fxios|edgios)/i.test(userAgent)
  const displayModeMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)')
    : null
  const isStandalone = (displayModeMedia?.matches ?? false) || navigator.standalone === true

  if (isiOS && isSafari && !isStandalone && !hasDismissedIOSPrompt()) {
    iosBanner.removeAttribute('hidden')
  } else {
    iosBanner.setAttribute('hidden', '')
  }
}

export function setupPwaInstall () {
  if (typeof document === 'undefined') return

  const installButton = document.getElementById('btn-install-app')
  const iosDismissButton = document.getElementById('iosInstallDismiss')
  const iosBanner = document.getElementById('iosInstallPrompt')
  const displayModeMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)')
    : null

  hideInstallButton(installButton)

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredPrompt = event
    showInstallButton(installButton)
  })

  installButton?.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.warn('No install prompt available')
      return
    }

    installButton.disabled = true
    const promptEvent = deferredPrompt
    deferredPrompt = null
    promptEvent.prompt()
    try {
      await promptEvent.userChoice
    } catch (error) {
      console.warn('Install prompt failed', error)
    } finally {
      hideInstallButton(installButton)
    }
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    hideInstallButton(installButton)
    hideIOSHint(true)
  })

  if (displayModeMedia?.addEventListener) {
    displayModeMedia.addEventListener('change', event => {
      if (event.matches) {
        hideInstallButton(installButton)
        hideIOSHint(true)
      }
    })
  }

  iosDismissButton?.addEventListener('click', () => {
    hideIOSHint(true)
  })

  iosBanner?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      hideIOSHint(true)
    }
  })

  iosBanner?.addEventListener('click', event => {
    if (event.target === iosBanner) {
      hideIOSHint(true)
    }
  })

  maybeShowIOSHint()
}

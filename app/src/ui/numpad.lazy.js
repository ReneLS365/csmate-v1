let loaderPromise = null

function matchesTarget (target) {
  if (!(target instanceof Element)) return false
  return target.matches('input[data-numpad="true"]')
}

async function loadNumpadModules () {
  if (!loaderPromise) {
    loaderPromise = Promise.all([
      import('../ui/numpad.init.js'),
      import('../modules/numpadOverlay.js')
    ]).then(([initModule, overlayModule]) => {
      overlayModule.initNumpadOverlay()
      initModule.initNumpadBinding()
      return initModule
    }).catch(error => {
      loaderPromise = null
      throw error
    })
  }
  return loaderPromise
}

export function installLazyNumpad () {
  if (typeof document === 'undefined') return
  let primed = false
  const prime = () => {
    if (primed) return
    primed = true
    void loadNumpadModules()
  }

  document.addEventListener('pointerdown', event => {
    if (matchesTarget(event.target)) {
      prime()
    }
  }, { passive: true })

  document.addEventListener('focusin', event => {
    if (matchesTarget(event.target)) {
      prime()
    }
  })

  // prefetch numpad after initial idle to improve responsiveness
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => prime())
  } else {
    setTimeout(() => prime(), 1200)
  }
}

export function forceLoadNumpad () {
  return loadNumpadModules()
}

let loaderPromise = null
let numpadReady = false
const scheduleFrame = (callback) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback)
  }
  return setTimeout(callback, 16)
}

function resolveInputTarget (target) {
  if (!(target instanceof Element)) return null
  if (target.matches('input[data-numpad="true"]')) {
    return target
  }
  const direct = target.closest('input[data-numpad="true"]')
  if (direct instanceof HTMLInputElement) {
    return direct
  }
  if (target instanceof HTMLLabelElement && target.htmlFor) {
    const labelTarget = document.getElementById(target.htmlFor)
    if (labelTarget instanceof HTMLInputElement && labelTarget.matches('input[data-numpad="true"]')) {
      return labelTarget
    }
  }
  const labelled = target.closest('label')
  if (labelled instanceof HTMLLabelElement) {
    const input = labelled.querySelector('input[data-numpad="true"]')
    if (input instanceof HTMLInputElement) {
      return input
    }
  }
  return null
}

async function loadNumpadModules () {
  if (!loaderPromise) {
    loaderPromise = Promise.all([
      import('../ui/numpad.init.js'),
      import('../modules/numpadOverlay.js')
    ]).then(([initModule, overlayModule]) => {
      overlayModule.initNumpadOverlay()
      initModule.initNumpadBinding()
      numpadReady = true
      return initModule
    }).catch(error => {
      loaderPromise = null
      numpadReady = false
      throw error
    })
  }
  return loaderPromise
}

function scheduleOpen (input) {
  if (!(input instanceof HTMLInputElement)) return
  scheduleFrame(() => {
    if (!input.isConnected) return
    try {
      input.focus({ preventScroll: true })
    } catch {
      input.focus()
    }
    input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

export function installLazyNumpad () {
  if (typeof document === 'undefined') return

  const ensureLoaded = (input, afterLoad) => {
    return loadNumpadModules().then(module => {
      if (typeof afterLoad === 'function') {
        afterLoad(module)
      }
      return module
    }).catch(error => {
      console.error('Kunne ikke indlæse numerisk tastatur', error)
      throw error
    })
  }

  document.addEventListener('click', event => {
    const input = resolveInputTarget(event.target)
    if (!input) return
    if (numpadReady) return
    event.preventDefault()
    event.stopPropagation()
    ensureLoaded(input, () => scheduleOpen(input))
  }, true)

  document.addEventListener('focusin', event => {
    const input = resolveInputTarget(event.target)
    if (!input || numpadReady) return
    void ensureLoaded(input)
  })
}

export function forceLoadNumpad () {
  return loadNumpadModules()
}

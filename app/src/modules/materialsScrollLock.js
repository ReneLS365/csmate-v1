/**
 * @purpose Prevent scroll chaining and rubber-band bounce in the materials list.
 * @inputs root: optional Element|Document to scope the container lookup.
 * @outputs void
 */
const initializedContainers = new WeakSet()

const SELECTORS = [
  '#materials .mat-scroll',
  '#materials-list',
  '.materials-scroll',
  '#materials',
  '.materials-v2__body'
]

function findMaterialsScrollContainer (root = document) {
  if (!root || typeof root.querySelector !== 'function') {
    return null
  }

  for (const selector of SELECTORS) {
    const found = root.querySelector(selector)
    if (found) {
      return found
    }
  }

  if (root !== document) {
    return findMaterialsScrollContainer(document)
  }

  return null
}

export function initMaterialsScrollLock (root = document) {
  const container = findMaterialsScrollContainer(root)
  if (!container || initializedContainers.has(container)) {
    return
  }

  const lockWithinBounds = () => {
    const max = Math.max(0, container.scrollHeight - container.clientHeight)
    if (container.scrollTop > max) {
      container.scrollTop = max
    }
  }

  const handleTouchStart = () => {
    const max = Math.max(0, container.scrollHeight - container.clientHeight)
    if (container.scrollTop <= 0 && max > 0) {
      container.scrollTop = 1
    } else if (container.scrollTop >= max && max > 0) {
      container.scrollTop = max - 1
    }
  }

  const handleTouchMove = event => {
    const atTop = container.scrollTop <= 0
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight
    if (atTop || atBottom) {
      event.preventDefault()
    }
  }

  const handleWheel = event => {
    const delta = Math.sign(event.deltaY)
    if (delta === 0) return
    const atTop = container.scrollTop <= 0
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight
    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const handleResize = () => {
    lockWithinBounds()
  }

  container.addEventListener('touchstart', handleTouchStart, { passive: true })
  container.addEventListener('touchmove', handleTouchMove, { passive: false })
  container.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('resize', handleResize)

  initializedContainers.add(container)
}

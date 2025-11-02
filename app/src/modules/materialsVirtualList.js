const DEFAULT_ROW_HEIGHT = 64
const DEFAULT_OVERSCAN = 6
const DEFAULT_ROW_GAP = 8

export function createVirtualMaterialsList ({
  container,
  items = [],
  renderRow,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  gap = DEFAULT_ROW_GAP
}) {
  if (!container) {
    throw new Error('container is required for virtual list')
  }
  if (typeof renderRow !== 'function') {
    throw new Error('renderRow callback is required')
  }

  const state = {
    items: Array.isArray(items) ? items.slice() : [],
    renderRow,
    rowHeight,
    overscan,
    pool: document.createElement('div'),
    spacer: document.createElement('div'),
    cache: new Map(),
    gap,
    hasMeasured: false
  }

  container.innerHTML = ''
  container.classList.add('materials-virtual-list')
  container.style.position = 'relative'
  container.style.overflowY = container.style.overflowY || 'auto'

  state.pool.className = 'materials-virtual-pool'
  state.pool.style.position = 'absolute'
  state.pool.style.left = '0'
  state.pool.style.right = '0'
  state.pool.style.top = '0'

  state.spacer.className = 'materials-virtual-spacer'
  state.spacer.style.width = '100%'

  container.appendChild(state.spacer)
  container.appendChild(state.pool)

  function getRow (index) {
    if (index < 0 || index >= state.items.length) return null
    if (state.cache.has(index)) {
      return state.cache.get(index)
    }
    const item = state.items[index]
    const result = state.renderRow(item, index)
    const element = result?.row || result
    if (!(element instanceof HTMLElement)) return null
    element.dataset.virtualIndex = String(index)
    element.style.position = 'absolute'
    element.style.left = '0'
    element.style.right = '0'
    element.style.willChange = 'transform'
    if (!state.hasMeasured) {
      state.pool.appendChild(element)
      const rect = element.getBoundingClientRect()
      const measuredHeight = rect?.height || 0
      if (measuredHeight > 0) {
        state.rowHeight = measuredHeight + state.gap
        state.hasMeasured = true
      }
    }
    state.cache.set(index, element)
    return element
  }

  function updateSpacerHeight () {
    const safeRowHeight = state.rowHeight || DEFAULT_ROW_HEIGHT
    state.spacer.style.height = `${state.items.length * safeRowHeight}px`
  }

  function render () {
    const scrollTop = container.scrollTop
    const viewportHeight = container.clientHeight || 0
    const safeRowHeight = state.rowHeight || DEFAULT_ROW_HEIGHT
    const startIndex = Math.max(Math.floor(scrollTop / safeRowHeight) - state.overscan, 0)
    const endIndex = Math.min(
      state.items.length,
      Math.ceil((scrollTop + viewportHeight) / safeRowHeight) + state.overscan
    )

    const nextChildren = new Set()
    for (let index = startIndex; index < endIndex; index += 1) {
      const row = getRow(index)
      if (!row) continue
      row.style.transform = `translateY(${index * safeRowHeight}px)`
      nextChildren.add(row)
      if (row.parentElement !== state.pool) {
        state.pool.appendChild(row)
      }
    }

    Array.from(state.pool.children).forEach(child => {
      if (!nextChildren.has(child)) {
        state.pool.removeChild(child)
      }
    })
  }

  function clearCache () {
    state.cache.forEach(element => {
      if (element?.parentElement === state.pool) {
        state.pool.removeChild(element)
      }
    })
    state.cache.clear()
    state.hasMeasured = false
  }

  function setItems (nextItems) {
    state.items = Array.isArray(nextItems) ? nextItems.slice() : []
    clearCache()
    updateSpacerHeight()
    render()
  }

  function onScroll () {
    render()
  }

  container.addEventListener('scroll', onScroll, { passive: true })
  updateSpacerHeight()
  render()

  return {
    update (nextItems) {
      setItems(nextItems)
    },
    destroy () {
      container.removeEventListener('scroll', onScroll)
      clearCache()
      container.innerHTML = ''
    }
  }
}

/**
 * @vitest-environment jsdom
 */
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest'
import { initMaterialsScrollLock } from '../app/src/modules/materialsScrollLock.js'

function createMaterialsContainer () {
  const container = document.createElement('div')
  container.className = 'materials-scroll'
  Object.defineProperty(container, 'scrollHeight', { value: 200, configurable: true })
  Object.defineProperty(container, 'clientHeight', { value: 100, configurable: true })
  container.scrollTop = 0
  document.body.appendChild(container)
  return container
}

describe('materials scroll lock', () => {
  let container

  beforeEach(() => {
    document.body.innerHTML = ''
    container = createMaterialsContainer()
    initMaterialsScrollLock()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('primes the scroll position on touchstart when at the top', () => {
    container.scrollTop = 0
    container.dispatchEvent(new window.Event('touchstart', { bubbles: true }))
    expect(container.scrollTop).toBe(1)
  })

  it('blocks touchmove events at the scroll extents', () => {
    container.scrollTop = container.scrollHeight - container.clientHeight
    const touchEvent = new window.Event('touchmove', { bubbles: true, cancelable: true })
    container.dispatchEvent(touchEvent)
    expect(touchEvent.defaultPrevented).toBe(true)

    container.scrollTop = 50
    const midScrollEvent = new window.Event('touchmove', { bubbles: true, cancelable: true })
    container.dispatchEvent(midScrollEvent)
    expect(midScrollEvent.defaultPrevented).toBe(false)
  })

  it('prevents wheel propagation when attempting to scroll past bounds', () => {
    container.scrollTop = 0
    const wheelEvent = new window.Event('wheel', { bubbles: true, cancelable: true })
    vi.spyOn(wheelEvent, 'stopPropagation')
    Object.defineProperty(wheelEvent, 'deltaY', { value: -30, configurable: true })
    container.dispatchEvent(wheelEvent)

    expect(wheelEvent.defaultPrevented).toBe(true)
    expect(wheelEvent.stopPropagation).toHaveBeenCalledTimes(1)
  })
})

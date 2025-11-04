import { describe, it, expect, beforeEach } from 'vitest'
import { getAdminState, setAdminOk, setLock, subscribe, isLocked, isAdminAuthenticated } from '../app/src/state/admin.js'

describe('Admin state management', () => {
  beforeEach(() => {
    // Reset state before each test
    setLock(true)
    setAdminOk(false)
  })

  it('should initialize with locked state', () => {
    const state = getAdminState()
    expect(state.lockNonInputs).toBe(true)
    expect(state.adminCodeOk).toBe(false)
  })

  it('should toggle lock state', () => {
    expect(isLocked()).toBe(true)
    setLock(false)
    expect(isLocked()).toBe(false)
    setLock(true)
    expect(isLocked()).toBe(true)
  })

  it('should set admin authentication', () => {
    expect(isAdminAuthenticated()).toBe(false)
    setAdminOk(true)
    expect(isAdminAuthenticated()).toBe(true)
  })

  it('should unlock when admin is authenticated', () => {
    expect(isLocked()).toBe(true)
    setAdminOk(true)
    expect(isLocked()).toBe(false)
    expect(isAdminAuthenticated()).toBe(true)
  })

  it('should notify listeners on state change', () => {
    let notificationCount = 0
    let lastState = null

    const unsubscribe = subscribe((state) => {
      notificationCount++
      lastState = state
    })

    setLock(false)
    expect(notificationCount).toBe(1)
    expect(lastState.lockNonInputs).toBe(false)

    setAdminOk(true)
    expect(notificationCount).toBe(2)
    expect(lastState.adminCodeOk).toBe(true)

    unsubscribe()
  })

  it('should allow unsubscribing listeners', () => {
    let notificationCount = 0

    const unsubscribe = subscribe(() => {
      notificationCount++
    })

    setLock(false)
    expect(notificationCount).toBe(1)

    unsubscribe()

    setLock(true)
    expect(notificationCount).toBe(1) // Should not increase after unsubscribe
  })

  it('should handle multiple listeners', () => {
    let count1 = 0
    let count2 = 0

    const unsub1 = subscribe(() => { count1++ })
    const unsub2 = subscribe(() => { count2++ })

    setLock(false)
    expect(count1).toBe(1)
    expect(count2).toBe(1)

    unsub1()
    setAdminOk(true)
    expect(count1).toBe(1) // Should not increase
    expect(count2).toBe(2) // Should increase

    unsub2()
  })
})

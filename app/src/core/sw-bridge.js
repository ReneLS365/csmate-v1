export function initSwBridge () {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('message', async event => {
    if (event?.data?.type === 'QUEUE_DRAIN') {
      try {
        const module = await import('./net-queue.js')
        await module.drain()
      } catch (error) {
        console.warn('Kø-drain fra SW fejlede', error)
      }
    }
  })
}

export async function requestSync () {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration) return
    if ('sync' in registration) {
      await registration.sync.register('csmate-sync-queue')
    } else if (registration.active) {
      registration.active.postMessage({ type: 'REQUEST_SYNC' })
    }
  } catch (error) {
    console.warn('Kunne ikke registrere background sync', error)
  }
}

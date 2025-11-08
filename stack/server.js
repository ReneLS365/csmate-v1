import { StackServerApp } from '@stackframe/js'
import { loadStackConfig } from './config.js'

let cachedApp = null

export function createStackServerApp (options = {}) {
  const config = loadStackConfig(options)
  const factory = options.factory ?? ((cfg) => new StackServerApp(cfg))
  const app = factory({
    projectId: config.projectId,
    publishableClientKey: config.publishableClientKey,
    secretServerKey: config.secretServerKey,
    tokenStore: config.tokenStore || 'memory',
    baseUrl: config.baseUrl || undefined
  })
  return app
}

export function getStackServerApp (options = {}) {
  if (!cachedApp || options.force === true) {
    cachedApp = createStackServerApp(options)
  }
  return cachedApp
}

export function resetStackServerApp () {
  cachedApp = null
}

export default getStackServerApp

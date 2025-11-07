#!/usr/bin/env node
import process from 'node:process'
import { getStackServerApp } from '../stack/server.js'
import { maskSecret, loadStackConfig } from '../stack/config.js'

function parseArgs (argv) {
  const args = argv.slice(2)
  const flags = { json: false }
  const positional = []
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (value === '--json') {
      flags.json = true
      continue
    }
    if (value.startsWith('--')) {
      continue
    }
    positional.push(value)
  }
  return { positional, flags }
}

async function main () {
  const { positional, flags } = parseArgs(process.argv)
  const userId = positional[0] || process.env.STACK_TEST_USER_ID
  if (!userId) {
    console.error('Missing user id. Provide one as an argument or set STACK_TEST_USER_ID.')
    process.exitCode = 1
    return
  }

  let config
  try {
    config = loadStackConfig()
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
    return
  }

  const app = getStackServerApp({ force: true })

  try {
    const user = await app.getUser(userId)
    if (!user) {
      console.error(`User not found for id: ${userId}`)
      process.exitCode = 1
      return
    }
    const output = {
      id: user.id,
      primaryEmail: user.primaryEmail ?? null,
      emails: Array.isArray(user.emails) ? user.emails.map((entry) => ({
        email: entry.email,
        verified: Boolean(entry.verified)
      })) : [],
      profile: user.profile ?? null,
      serverMetadata: user.serverMetadata ?? null,
      lastActiveAt: user.lastActiveAt instanceof Date ? user.lastActiveAt.toISOString() : null
    }

    if (flags.json) {
      console.log(JSON.stringify(output, null, 2))
    } else {
      console.log('Neon Auth project:', config.projectId)
      console.log('Publishable key:', maskSecret(config.publishableClientKey))
      console.log('Secret key:', maskSecret(config.secretServerKey))
      console.log('User:', JSON.stringify(output, null, 2))
    }
  } catch (error) {
    console.error('Failed to fetch user from Neon Auth:', error?.message || error)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})

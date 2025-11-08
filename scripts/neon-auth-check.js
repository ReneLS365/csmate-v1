#!/usr/bin/env node

import process from 'node:process'
import crypto from 'node:crypto'
import { parseArgs } from 'node:util'
import { neon } from '@neondatabase/serverless'

function redactIdentifier (value) {
  if (typeof value !== 'string' || value.length === 0) return 'n/a'
  const hash = crypto.createHash('sha256').update(value).digest('hex')
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`
}

async function fetchUser (sql, id) {
  const rows = await sql`
    select
      id,
      email,
      name,
      auth_provider as "authProvider",
      auth_sub as "authSub",
      created_at as "createdAt"
    from users
    where id = ${id}
    limit 1
  `
  return rows?.[0] ?? null
}

async function main () {
  const parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      connection: { type: 'string' },
      json: { type: 'boolean', default: false }
    }
  })

  const userId = parsed.positionals[0] || process.env.STACK_TEST_USER_ID
  if (!userId) {
    console.error('Missing user id. Provide one as an argument or set STACK_TEST_USER_ID.')
    process.exitCode = 1
    return
  }

  const connectionString =
    parsed.values.connection ||
    process.env.NEON_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    process.env.VITE_DATABASE_URL

  if (!connectionString) {
    console.error('Missing Neon connection string. Set NEON_CONNECTION_STRING or DATABASE_URL.')
    process.exitCode = 1
    return
  }

  try {
    const sql = neon(connectionString)
    const user = await fetchUser(sql, userId)
    if (!user) {
      console.error(`User lookup failed for reference ${redactIdentifier(userId)}.`)
      process.exitCode = 1
      return
    }

    if (parsed.values.json) {
      console.log(JSON.stringify(user, null, 2))
    } else {
      console.log(`User ${redactIdentifier(user.id)} (${user.email || 'ukendt email'}) fundet.`)
    }
  } catch (error) {
    console.error('Failed to fetch user from Neon', error)
    process.exitCode = 1
  }
}

main()

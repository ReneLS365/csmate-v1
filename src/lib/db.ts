// src/lib/db.ts
// central Drizzle + Neon database-klient

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const connectionString =
  // Vite-style env i browser/verden
  // @ts-ignore
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DATABASE_URL) ||
  process.env.VITE_DATABASE_URL ||
  process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('VITE_DATABASE_URL mangler – sæt den i Netlify env / lokal .env')
}

const sql = neon(connectionString)

export const db = drizzle(sql)

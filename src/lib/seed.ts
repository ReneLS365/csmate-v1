// src/lib/seed.ts
// Simpel seed-script til at oprette:
// - Hulmose tenant
// - Roller (owner, admin, foreman, worker)
// - Lønprofiler (udd1, udd2, mentor)
// - Admin key "StilAce" (hashes med bcryptjs)

import { db } from './db'
import { tenants, roles, payProfiles, adminKeys } from './schema'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('Seeding CSMate database...')

  const [hulmose] = await db
    .insert(tenants)
    .values({ slug: 'hulmose', name: 'Hulmose Stilladser ApS' })
    .returning()

  console.log('Tenant oprettet:', hulmose)

  await db.insert(roles).values([
    { code: 'owner', name: 'Ejer', rank: 1 },
    { code: 'admin', name: 'Admin', rank: 10 },
    { code: 'foreman', name: 'Formand', rank: 20 },
    { code: 'worker', name: 'Montør', rank: 50 },
  ])

  console.log('Roller oprettet')

  await db.insert(payProfiles).values([
    {
      tenantId: hulmose.id,
      code: 'udd1',
      name: 'Uddannelse 1',
      baseWageHourly: '147.00',
      allowanceHourly: '42.98',
      kmRate: '2.12',
      isDefault: true,
    },
    {
      tenantId: hulmose.id,
      code: 'udd2',
      name: 'Uddannelse 2',
      baseWageHourly: '147.00',
      allowanceHourly: '49.38',
      kmRate: '2.12',
    },
    {
      tenantId: hulmose.id,
      code: 'mentor',
      name: 'Mentor',
      baseWageHourly: '147.00',
      allowanceHourly: '22.26',
      kmRate: '2.12',
    },
  ])

  console.log('Lønprofiler oprettet')

  const plainKey = 'StilAce' // TODO: skift i produktion
  const keyHash = await bcrypt.hash(plainKey, 10)

  await db.insert(adminKeys).values({
    tenantId: hulmose.id,
    label: 'Global admin kode',
    keyHash,
  })

  console.log('Admin key oprettet for Hulmose (label: Global admin kode)')
}

seed()
  .then(() => {
    console.log('Seed færdig')
  })
  .catch((err) => {
    console.error('Seed fejl', err)
    process.exit(1)
  })

// src/lib/schema.ts
import {
  pgTable,
  serial,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------- TENANTS / FIRMAER ----------

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(), // fx "hulmose"
  name: varchar('name', { length: 255 }).notNull(),
  country: varchar('country', { length: 2 }).default('DK'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- ADMIN KEYS (StilAce m.fl.) ----------

export const adminKeys = pgTable('admin_keys', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 128 }).notNull(), // fx "Global admin kode"
  keyHash: varchar('key_hash', { length: 255 }).notNull(), // Bcrypt/argon hash
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- USERS ----------
// Kun identitet + auth-kobling. Roller styres via memberships.

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  authProvider: varchar('auth_provider', { length: 32 }).default('auth0').notNull(),
  authSub: varchar('auth_sub', { length: 255 }).notNull().unique(), // fx auth0|xxxx
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
})

export const userTenants = pgTable(
  'user_tenants',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.userId, table.tenantId] }),
  }),
)

// ---------- ROLLER ----------
// Globalt rollekatalog (owner, admin, kontor, formand, montør, lærling)

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(), // "owner", "admin", "foreman", "worker"
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  rank: integer('rank').default(100).notNull(), // lavere = mere power
})

// ---------- PAY PROFILES / LØNPROFILER ----------
// Udd1, Udd2, Mentor, m.v. pr. firma.

export const payProfiles = pgTable('pay_profiles', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 32 }).notNull(), // "udd1", "udd2", "mentor"
  name: varchar('name', { length: 128 }).notNull(),
  baseWageHourly: numeric('base_wage_hourly', { precision: 10, scale: 2 }).notNull(), // 147
  allowanceHourly: numeric('allowance_hourly', {
    precision: 10,
    scale: 2,
  }).default('0'),
  kmRate: numeric('km_rate', { precision: 10, scale: 2 }).default('0'), // 2.12
  overtimeWeekdayMultiplier: numeric('ot_weekday_mult', {
    precision: 5,
    scale: 2,
  }).default('1.50'),
  overtimeWeekendMultiplier: numeric('ot_weekend_mult', {
    precision: 5,
    scale: 2,
  }).default('2.00'),
  validFrom: date('valid_from').defaultNow(),
  validTo: date('valid_to'),
  isDefault: boolean('is_default').default(false).notNull(),
})

// ---------- PROJECTS / SAGER ----------

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 64 }).notNull(), // fx E-komplet projektnr.
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }),
  city: varchar('city', { length: 128 }),
  status: varchar('status', { length: 32 }).default('open').notNull(), // open / closed / archived
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- AKKORD-SHEETS / HOVEDLINJE ----------

export const akkordSheets = pgTable('akkord_sheets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sheetNo: varchar('sheet_no', { length: 64 }).notNull(), // fx "A-001"
  phase: varchar('phase', { length: 32 }).default('montage').notNull(), // montage/demontage/service
  system: varchar('system', { length: 32 }), // BOSTA70, HAKI, MODEX, Alfix VARIO
  payProfileId: integer('pay_profile_id').references(() => payProfiles.id),
  hoursTotal: numeric('hours_total', { precision: 10, scale: 2 }).default('0'),
  kmTotal: numeric('km_total', { precision: 10, scale: 2 }).default('0'),
  slæbPercent: numeric('slaeb_percent', { precision: 5, scale: 2 }).default('0'),
  extraPercent: numeric('extra_percent', { precision: 5, scale: 2 }).default('0'),
  demontageFactor: numeric('demontage_factor', { precision: 5, scale: 2 }).default('0.50'), // 50 % regel
  materialSum: numeric('material_sum', { precision: 14, scale: 2 }).default('0'),
  montageSum: numeric('montage_sum', { precision: 14, scale: 2 }).default('0'),
  demontageSum: numeric('demontage_sum', { precision: 14, scale: 2 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).default('0'),
  hourRate: numeric('hour_rate', { precision: 10, scale: 2 }).default('0'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- AKKORD-LINJER / MATERIALER ----------

export const akkordLines = pgTable('akkord_lines', {
  id: serial('id').primaryKey(),
  sheetId: uuid('sheet_id')
    .notNull()
    .references(() => akkordSheets.id, { onDelete: 'cascade' }),
  system: varchar('system', { length: 32 }), // BOSTA70/HAKI/...
  componentCode: varchar('component_code', { length: 64 }).notNull(), // fx "RA-200/70"
  description: varchar('description', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 16 }).default('stk'),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
})

// ---------- LØN POSTER / FORDELING ----------

export const wagePostings = pgTable('wage_postings', {
  id: serial('id').primaryKey(),
  sheetId: uuid('sheet_id')
    .notNull()
    .references(() => akkordSheets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  payProfileId: integer('pay_profile_id').references(() => payProfiles.id),
  hours: numeric('hours', { precision: 10, scale: 2 }).notNull(),
  km: numeric('km', { precision: 10, scale: 2 }).default('0'),
  hourRate: numeric('hour_rate', { precision: 10, scale: 2 }).notNull(), // faktisk kr/t efter alt
  totalPay: numeric('total_pay', { precision: 14, scale: 2 }).notNull(),
  comment: varchar('comment', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- USER ↔ TENANT MEMBERSHIP ----------

export const userTenantMemberships = pgTable('user_tenant_memberships', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id),
  defaultPayProfileId: integer('default_pay_profile_id').references(
    () => payProfiles.id,
  ),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------- RELATIONS ----------

export const tenantsRelations = relations(tenants, ({ many }) => ({
  adminKeys: many(adminKeys),
  projects: many(projects),
  payProfiles: many(payProfiles),
  userTenants: many(userTenants),
  memberships: many(userTenantMemberships),
  akkordSheets: many(akkordSheets),
}))

export const adminKeysRelations = relations(adminKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [adminKeys.tenantId],
    references: [tenants.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  tenantRoles: many(userTenants),
  memberships: many(userTenantMemberships),
  wagePostings: many(wagePostings),
  createdProjects: many(projects),
  createdSheets: many(akkordSheets),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  memberships: many(userTenantMemberships),
}))

export const membershipsRelations = relations(userTenantMemberships, ({ one }) => ({
  user: one(users, {
    fields: [userTenantMemberships.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenantMemberships.tenantId],
    references: [tenants.id],
  }),
  role: one(roles, {
    fields: [userTenantMemberships.roleId],
    references: [roles.id],
  }),
  defaultPayProfile: one(payProfiles, {
    fields: [userTenantMemberships.defaultPayProfileId],
    references: [payProfiles.id],
  }),
}))

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, {
    fields: [userTenants.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenants.tenantId],
    references: [tenants.id],
  }),
}))

export const payProfilesRelations = relations(payProfiles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [payProfiles.tenantId],
    references: [tenants.id],
  }),
  sheets: many(akkordSheets),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdByUserId],
    references: [users.id],
  }),
  sheets: many(akkordSheets),
}))

export const akkordSheetsRelations = relations(akkordSheets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [akkordSheets.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [akkordSheets.projectId],
    references: [projects.id],
  }),
  payProfile: one(payProfiles, {
    fields: [akkordSheets.payProfileId],
    references: [payProfiles.id],
  }),
  createdBy: one(users, {
    fields: [akkordSheets.createdByUserId],
    references: [users.id],
  }),
  lines: many(akkordLines),
  wagePostings: many(wagePostings),
}))

export const akkordLinesRelations = relations(akkordLines, ({ one }) => ({
  sheet: one(akkordSheets, {
    fields: [akkordLines.sheetId],
    references: [akkordSheets.id],
  }),
}))

export const wagePostingsRelations = relations(wagePostings, ({ one }) => ({
  sheet: one(akkordSheets, {
    fields: [wagePostings.sheetId],
    references: [akkordSheets.id],
  }),
  user: one(users, {
    fields: [wagePostings.userId],
    references: [users.id],
  }),
  payProfile: one(payProfiles, {
    fields: [wagePostings.payProfileId],
    references: [payProfiles.id],
  }),
}))

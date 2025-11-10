CREATE TABLE IF NOT EXISTS "user_tenants" (
  "user_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "role" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_tenants_user_id_tenant_id_pk" PRIMARY KEY ("user_id", "tenant_id"),
  CONSTRAINT "user_tenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "user_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "user_tenants_user_idx" ON "user_tenants" ("user_id");
CREATE INDEX IF NOT EXISTS "user_tenants_tenant_idx" ON "user_tenants" ("tenant_id");

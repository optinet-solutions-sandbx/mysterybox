import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Test-only: runs supabase/migrations + seed.sql in an in-process Postgres (PGlite), with a shim
 * for the parts of Supabase that aren't plain Postgres (auth and storage schemas, anon/
 * authenticated/service_role, default grants). Lets vitest check the schema, RLS and RPCs without Docker.
 */

export const SUPABASE_DIR = fileURLToPath(new URL("../../../supabase/", import.meta.url));

const SHIM = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz default now()
);
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
`;

export async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(SHIM);
  const dir = `${SUPABASE_DIR}migrations/`;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(dir + file, "utf8"));
  }
  await db.exec(readFileSync(`${SUPABASE_DIR}seed.sql`, "utf8"));
  return db;
}

/** Runs `fn` as a signed-in user (Supabase's `authenticated` role with a JWT `sub`), or anon. */
export async function as<T>(db: PGlite, userId: string | null, fn: () => Promise<T>, jwtRole?: string): Promise<T> {
  const role = jwtRole ?? (userId ? "authenticated" : "anon");
  const claims = JSON.stringify(userId ? { sub: userId, role } : { role });
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  await db.exec(`set role ${role === "service_role" ? "service_role" : userId ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

/** Inserts an auth user the way Supabase Auth does on sign-up (fires on_auth_user_created). */
export async function signUp(db: PGlite, email: string, meta: Record<string, unknown> = {}): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return rows[0].id;
}

/** Superuser shortcut for test setup (bypasses RLS like the service role / SQL editor would). */
export async function sql<T = Record<string, unknown>>(db: PGlite, query: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(query, params)).rows;
}

/** Calls an RPC and returns its jsonb result. */
export async function rpc<T = Record<string, unknown>>(db: PGlite, fn: string, args: unknown[] = []): Promise<T> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await db.query<{ r: T }>(`select public.${fn}(${placeholders}) as r`, args);
  return rows[0].r;
}

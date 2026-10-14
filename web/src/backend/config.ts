/**
 * Backend switches. The box system has its own (NEXT_PUBLIC_BACKEND=mock|api, web/src/box-api).
 *
 * NEXT_PUBLIC_ACCOUNTS=supabase (with the URL and anon key): login and identity on Supabase Auth,
 *   roles, status, locks, tags, comments, staff and audit in the database.
 * NEXT_PUBLIC_CATALOG=supabase: also serve items, boxes and odds from the database and let staff
 *   edit them. Off until the team decides whether the catalogue lives in Supabase or the kit's API.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabase = process.env.NEXT_PUBLIC_ACCOUNTS === "supabase" && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
export const isSupabaseCatalog = isSupabase && process.env.NEXT_PUBLIC_CATALOG === "supabase";

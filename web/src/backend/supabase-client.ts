"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { BackendError, toErrorCode } from "./contract";

let client: SupabaseClient | null = null;

/** The browser's Supabase client (session kept in localStorage, refreshed automatically). */
export function sb(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "grailnoir-auth-session" },
  });
  return client;
}

/** Throws a BackendError with the SQL function's stable code (insufficient_funds, forbidden, …). */
export function check<T>(res: { data: unknown; error: { message?: string } | null }): T {
  if (res.error) throw new BackendError(toErrorCode(res.error.message), res.error.message);
  return res.data as T;
}

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return check<T>(await sb().rpc(fn, args));
}

/** Bearer token for our own API routes (staff-only server actions). */
export async function accessToken(): Promise<string> {
  const { data } = await sb().auth.getSession();
  if (!data.session) throw new BackendError("not_authenticated");
  return data.session.access_token;
}

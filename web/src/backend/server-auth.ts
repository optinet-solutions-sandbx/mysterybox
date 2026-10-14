import type { AppRole } from "./contract";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabase } from "./config";

/**
 * Server-side checks for our API routes. The browser sends its Supabase access token; we ask
 * Supabase who it is and what role they hold (public.current_app_role runs as that user).
 */
export async function staffFromRequest(req: Request, allowed: AppRole[]): Promise<{ id: string; role: AppRole } | null> {
  if (!isSupabase) return null;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) return null;
  const user = (await userRes.json()) as { id?: string };
  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_app_role`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: "{}",
  });
  if (!roleRes.ok || !user.id) return null;
  const role = (await roleRes.json()) as AppRole | null;
  return role && allowed.includes(role) ? { id: user.id, role } : null;
}

/** The service-role key: server only, never sent to the browser. */
export function serviceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function serviceHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
}

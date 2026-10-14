import { SUPABASE_URL } from "@/backend/config";
import { serviceHeaders, serviceKey, staffFromRequest } from "@/backend/server-auth";

/**
 * POST /api/admin/staff: a super admin adds a staff member. Creating an auth user needs the
 * service-role key, so this runs on the server: create the confirmed user (the sign-up trigger
 * makes the profile, player role and wallet), set the role, and write the audit entry.
 */
export async function POST(req: Request) {
  const caller = await staffFromRequest(req, ["super_admin"]);
  if (!caller) return Response.json({ error: "forbidden" }, { status: 403 });
  const key = serviceKey();
  if (!key) return Response.json({ error: "unavailable" }, { status: 503 });

  const body = (await req.json()) as { email?: string; firstName?: string; lastName?: string; role?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const role = body.role === "super_admin" ? "super_admin" : "admin";
  if (!email || !body.password) return Response.json({ error: "invalid" }, { status: 400 });

  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders(key),
    body: JSON.stringify({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { first_name: body.firstName ?? "", last_name: body.lastName ?? "", accepted_terms: true, confirmed_age: true },
    }),
  });
  if (!created.ok) {
    const err = (await created.json().catch(() => ({}))) as { error_code?: string; code?: string };
    const exists = err.error_code === "email_exists" || err.code === "email_exists" || created.status === 422;
    return Response.json({ error: exists ? "exists" : "failed" }, { status: exists ? 409 : 502 });
  }
  const user = (await created.json()) as { id: string };

  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}`, {
    method: "PATCH",
    headers: serviceHeaders(key),
    body: JSON.stringify({ role, granted_by: caller.id, granted_at: new Date().toISOString() }),
  });
  if (!roleRes.ok) return Response.json({ error: "failed" }, { status: 502 });

  await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
    method: "POST",
    headers: serviceHeaders(key),
    body: JSON.stringify({ actor_id: caller.id, actor_role: caller.role, action: "staff.create", target_type: "profile", target_id: user.id, detail: { account: email, role } }),
  });
  return Response.json({ ok: true });
}

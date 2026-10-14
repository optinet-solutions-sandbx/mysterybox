// Creates (or updates) the team's super-admin accounts in Supabase.
//
// Usage, from the repo root:
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service key> \
//     node scripts/provision_staff.mjs <team.json>
//
// team.json (never commit it; it holds passwords):
//   [{ "email": "alex@grailnoir.com", "firstName": "Alex", "password": "…" }, …]
//
// Each account is created confirmed (no email code), gets the super_admin role and an audit entry.
// Running it again resets the listed passwords and roles; other accounts are untouched.

import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];
if (!url || !key || !file) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and pass the team JSON file.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" };
const team = JSON.parse(readFileSync(file, "utf8"));

async function userIdFor(email) {
  const res = await fetch(`${url}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`, { headers });
  const rows = await res.json();
  return rows[0]?.id ?? null;
}

for (const member of team) {
  const email = member.email.trim().toLowerCase();
  let id = await userIdFor(email);
  if (!id) {
    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        password: member.password,
        email_confirm: true,
        user_metadata: { first_name: member.firstName ?? "", last_name: member.lastName ?? "", accepted_terms: true, confirmed_age: true },
      }),
    });
    if (!res.ok) {
      console.error(`✗ ${email}: ${res.status} ${await res.text()}`);
      continue;
    }
    id = (await res.json()).id;
  } else {
    await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "PUT", headers, body: JSON.stringify({ password: member.password, email_confirm: true }) });
  }
  const role = await fetch(`${url}/rest/v1/user_roles?user_id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ role: member.role ?? "super_admin", granted_at: new Date().toISOString() }),
  });
  await fetch(`${url}/rest/v1/audit_log`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "staff.provision", target_type: "profile", target_id: id, detail: { account: email, role: member.role ?? "super_admin", via: "provision_staff.mjs" } }),
  });
  console.log(`${role.ok ? "✓" : "✗"} ${email} → ${member.role ?? "super_admin"}`);
}

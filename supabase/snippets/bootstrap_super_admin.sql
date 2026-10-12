-- Run once in the Supabase SQL editor (it runs as the postgres role, so RLS doesn't apply)
-- after the first owner has signed up through the site. Sign-up always creates a player;
-- after this, that super admin promotes everyone else from the back office (admin_set_role).
update public.user_roles
set role = 'super_admin', granted_at = now()
where user_id = (select id from auth.users where email = 'owner@example.com');  -- ← the owner's email

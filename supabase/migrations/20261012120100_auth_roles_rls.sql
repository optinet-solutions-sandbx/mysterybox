-- Grail Noir: roles, sign-up, row-level security.
--
-- Three roles (public.app_role):
--   player       the customer. Sees and acts on their own account only.
--   admin        back office: reads every player, suspends / reactivates players, settles
--                pending payments, manages the catalog and shipments.
--   super_admin  everything an admin can do, plus staff roles, balance adjustments, settings and
--                the audit log.
-- See docs/08-backend.md for the full permission matrix.

-- Role helpers ----------------------------------------------------------------------------------
-- SECURITY DEFINER so policies can read user_roles without recursing into its own RLS.

create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() in ('admin', 'super_admin'), false)
$$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() = 'super_admin', false)
$$;

-- Trusted server context: the service-role key (payment webhooks, cron jobs).
create function public.is_service_role() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
$$;

-- Sign-up ---------------------------------------------------------------------------------------
-- The front end calls supabase.auth.signUp({ email, password, options: { data: {...} } }) with
-- the /register fields, then verifyOtp({ email, token, type: 'email' }) with the 6-digit code.
-- user_metadata is user-controlled: it may fill the profile, but never the role or status.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, email, first_name, last_name, phone_country, phone_dial, phone_number,
    marketing_opt_in, terms_accepted_at, age_confirmed_at
  ) values (
    new.id,
    new.email,
    left(coalesce(meta ->> 'first_name', ''), 80),
    left(coalesce(meta ->> 'last_name', ''), 80),
    left(meta ->> 'phone_country', 2),
    left(meta ->> 'phone_dial', 5),
    nullif(left(regexp_replace(coalesce(meta ->> 'phone_number', ''), '\D', '', 'g'), 15), ''),
    coalesce((meta ->> 'marketing_opt_in')::boolean, false),
    case when coalesce((meta ->> 'accepted_terms')::boolean, false) then now() end,
    case when coalesce((meta ->> 'confirmed_age')::boolean, false) then now() end
  );
  insert into public.user_roles (user_id, role) values (new.id, 'player');
  insert into public.wallets (user_id, balance_cents)
  values (
    new.id,
    coalesce((select (value #>> '{}')::bigint from public.settings where key = 'starting_balance_cents'), 0)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.wallets enable row level security;
alter table public.items enable row level security;
alter table public.boxes enable row level security;
alter table public.box_items enable row level security;
alter table public.seed_pairs enable row level security;
alter table public.openings enable row level security;
alter table public.inventory_items enable row level security;
alter table public.transactions enable row level security;
alter table public.shipments enable row level security;
alter table public.audit_log enable row level security;
alter table public.settings enable row level security;

-- Own rows, or every row for staff.
create policy "profiles: own or staff" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_staff()));
create policy "profiles: update own contact details" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "user_roles: own or staff" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "wallets: own or staff" on public.wallets
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "openings: own or staff" on public.openings
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "inventory: own or staff" on public.inventory_items
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "transactions: own or staff" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "shipments: own or staff" on public.shipments
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));

-- seed_pairs: no policy at all. Server seeds are only readable through get_my_seeds().

create policy "audit_log: super admin" on public.audit_log
  for select to authenticated using ((select public.is_super_admin()));

-- Catalog: anyone (signed out too) reads live boxes and their odds; staff read drafts and edit.
create policy "items: public read" on public.items
  for select to anon, authenticated using (active or (select public.is_staff()));
create policy "items: staff write" on public.items
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "boxes: public read live" on public.boxes
  for select to anon, authenticated using (status = 'live' or (select public.is_staff()));
create policy "boxes: staff write" on public.boxes
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "box_items: public read live" on public.box_items
  for select to anon, authenticated using (
    exists (select 1 from public.boxes b where b.id = box_id and b.status = 'live') or (select public.is_staff())
  );
create policy "box_items: staff write" on public.box_items
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "settings: public read" on public.settings
  for select to anon, authenticated using (true);
create policy "settings: super admin write" on public.settings
  for update to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

-- Table privileges (defence in depth on top of RLS) ---------------------------------------------
-- Supabase grants ALL on new public tables to anon/authenticated by default; take back writes
-- on everything the ledger functions own.

revoke insert, update, delete on
  public.profiles, public.user_roles, public.wallets, public.seed_pairs, public.openings,
  public.inventory_items, public.transactions, public.shipments, public.audit_log, public.settings
from anon, authenticated;
revoke select on public.seed_pairs from anon, authenticated;
revoke insert, update, delete on public.items, public.boxes, public.box_items from anon;

-- Players may edit contact details and preferences only (not email, status, KYC or state).
grant update (first_name, last_name, phone_country, phone_dial, phone_number, marketing_opt_in)
  on public.profiles to authenticated;
grant update (value, updated_at, updated_by) on public.settings to authenticated;

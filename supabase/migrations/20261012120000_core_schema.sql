-- Grail Noir: core schema (initial draft, 2026-10-12).
--
-- Accounts, wallet ledger, catalog (items, boxes, odds), play (seeds, openings, inventory),
-- fulfilment, audit and settings. Conventions shared with the front end (web/src/domain):
--   * Money is integer cents (bigint). Never floats.
--   * Odds are integer weights per box summing to boxes.odds_scale (100,000). The draw walks
--     box_items in `position` order, so position is part of the provably-fair contract.
--   * Clients never write ledger tables directly: every balance change goes through a function
--     in 20261012120200_wallet_and_play.sql, which also writes the transaction row.

create extension if not exists pgcrypto with schema extensions;

-- Enums -----------------------------------------------------------------------------------------

create type public.app_role as enum ('player', 'admin', 'super_admin');
create type public.account_status as enum ('active', 'suspended', 'self_excluded', 'closed');
create type public.kyc_status as enum ('not_started', 'pending', 'verified', 'rejected');

create type public.item_category as enum ('bags', 'watches', 'jewelry', 'eyewear', 'beauty', 'accessories', 'credit');
create type public.box_category as enum ('mixed', 'bags', 'watches', 'jewelry', 'eyewear', 'beauty', 'accessories');
create type public.box_material as enum ('navy', 'obsidian', 'sapphire', 'ivory', 'gold');
create type public.box_badge as enum ('new', 'hot', 'limited');
create type public.box_status as enum ('draft', 'live', 'retired');

create type public.transaction_type as enum ('deposit', 'withdrawal', 'box_open', 'sell_back', 'adjustment', 'shipping_fee', 'refund');
create type public.transaction_status as enum ('pending', 'completed', 'failed', 'cancelled');
create type public.inventory_status as enum ('held', 'sold', 'shipping_pending', 'shipping_processing', 'shipped', 'delivered');
create type public.shipment_status as enum ('requested', 'processing', 'shipped', 'delivered', 'cancelled');

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Accounts --------------------------------------------------------------------------------------

-- One row per auth user, created by the on_auth_user_created trigger from the sign-up form
-- (email, first/last name, country code + phone, marketing opt-in, 18+/terms).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone_country text,                 -- ISO code of the dial code picked at sign-up: US, CA, GB, ...
  phone_dial text,                    -- '+1'
  phone_number text,                  -- national number, digits only
  state text,                         -- US state code; placeholder until geo/KYC checks exist
  date_of_birth date,                 -- placeholder: captured by KYC
  marketing_opt_in boolean not null default false,
  terms_accepted_at timestamptz,
  age_confirmed_at timestamptz,
  status public.account_status not null default 'active',
  kyc_status public.kyc_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index profiles_created_at_idx on public.profiles (created_at);
create index profiles_email_idx on public.profiles (lower(email));
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Roles live apart from profiles so a player can never edit their own role. Only a super admin
-- changes them (admin_set_role).
create table public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.app_role not null default 'player',
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now()
);
create index user_roles_staff_idx on public.user_roles (role) where role <> 'player';

create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  held_cents bigint not null default 0 check (held_cents >= 0),   -- reserved by pending withdrawals
  currency char(3) not null default 'USD',
  updated_at timestamptz not null default now()
);

-- Catalog ---------------------------------------------------------------------------------------

create table public.items (
  id text primary key,                -- stable slug shared with the front end, e.g. 'rolex-datejust-36'
  name text not null,
  brand text not null,
  category public.item_category not null,
  value_cents bigint not null check (value_cents > 0),   -- listed value; drives RTP and sell-back
  image_url text,
  sku text,                           -- placeholder: supplier / stock reference
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

create table public.boxes (
  id text primary key,
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  category public.box_category not null default 'mixed',
  material public.box_material not null default 'obsidian',
  badge public.box_badge,
  featured boolean not null default false,
  price_cents bigint not null check (price_cents > 0),
  odds_scale integer not null default 100000 check (odds_scale > 0),
  -- Pricing input for the team's pricing model (web/src/domain/odds.ts priceForRtp). The price
  -- itself is stored explicitly; nothing recomputes it behind an operator's back.
  target_rtp numeric(5, 4) check (target_rtp > 0 and target_rtp < 1),
  status public.box_status not null default 'draft',
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger boxes_touch before update on public.boxes
  for each row execute function public.touch_updated_at();

-- The back-office odds. Players see the same weights, rounded for display.
create table public.box_items (
  box_id text not null references public.boxes (id) on delete cascade,
  item_id text not null references public.items (id),
  position smallint not null check (position >= 0),
  weight integer not null check (weight > 0),
  primary key (box_id, item_id),
  unique (box_id, position)
);

-- A box can only go live when its weights sum to its odds scale ...
create function public.check_box_odds() returns trigger
language plpgsql set search_path = '' as $$
declare
  total bigint;
begin
  if new.status = 'live' and (tg_op = 'INSERT' or old.status is distinct from 'live' or old.odds_scale <> new.odds_scale) then
    select coalesce(sum(weight), 0) into total from public.box_items where box_id = new.id;
    if total <> new.odds_scale then
      raise exception 'odds_do_not_sum: box % weights total %, expected %', new.id, total, new.odds_scale;
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;
create trigger boxes_check_odds before insert or update on public.boxes
  for each row execute function public.check_box_odds();

-- ... and its odds are frozen while it is live: set it back to draft (audited) to change them.
create function public.freeze_live_odds() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.boxes
    where id = coalesce(new.box_id, old.box_id) and status = 'live'
  ) then
    raise exception 'odds_frozen: box % is live; set it to draft before changing its odds', coalesce(new.box_id, old.box_id);
  end if;
  return coalesce(new, old);
end;
$$;
create trigger box_items_freeze before insert or update or delete on public.box_items
  for each row execute function public.freeze_live_odds();

-- Play ------------------------------------------------------------------------------------------

-- Provably-fair seed pairs. server_seed stays secret (no client can select this table) until the
-- pair is rotated; players read their seeds through get_my_seeds().
create table public.seed_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  server_seed text not null,
  server_seed_hash text not null,
  client_seed text not null,
  nonce integer not null default 0 check (nonce >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);
create unique index seed_pairs_one_active on public.seed_pairs (user_id) where active;

create table public.openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  box_id text not null references public.boxes (id),
  item_id text not null references public.items (id),
  price_cents bigint not null,          -- what the player paid (snapshot)
  item_value_cents bigint not null,     -- listed value of the piece at the time (snapshot)
  roll integer not null,
  seed_pair_id uuid not null references public.seed_pairs (id),
  server_seed_hash text not null,
  client_seed text not null,
  nonce integer not null,
  created_at timestamptz not null default now()
);
create index openings_user_idx on public.openings (user_id, created_at desc);
create index openings_box_idx on public.openings (box_id, created_at desc);
create index openings_created_idx on public.openings (created_at);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  item_id text not null references public.items (id),
  opening_id uuid not null unique references public.openings (id),
  status public.inventory_status not null default 'held',
  sell_back_cents bigint,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_user_idx on public.inventory_items (user_id, acquired_at desc);
create trigger inventory_touch before update on public.inventory_items
  for each row execute function public.touch_updated_at();

-- Wallet ledger ---------------------------------------------------------------------------------

-- Append-only. amount_cents is signed: + credits the wallet, - debits it.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  type public.transaction_type not null,
  status public.transaction_status not null default 'completed',
  amount_cents bigint not null,
  balance_after_cents bigint,           -- wallet balance once this row took effect
  opening_id uuid references public.openings (id),
  inventory_item_id uuid references public.inventory_items (id),
  provider text,                        -- placeholder: payment processor, once chosen
  provider_ref text,                    -- placeholder: processor's payment / payout id
  note text,
  created_by uuid references public.profiles (id),   -- staff member, for adjustments and settlements
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index transactions_user_idx on public.transactions (user_id, created_at desc);
create index transactions_type_idx on public.transactions (type, created_at);
create index transactions_pending_idx on public.transactions (created_at) where status = 'pending';

-- Fulfilment ------------------------------------------------------------------------------------

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id),
  user_id uuid not null references public.profiles (id),
  status public.shipment_status not null default 'requested',
  address jsonb not null default '{}'::jsonb,   -- placeholder snapshot until an address book exists
  carrier text,
  tracking_number text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index shipments_one_open on public.shipments (inventory_item_id)
  where status in ('requested', 'processing', 'shipped');
create trigger shipments_touch before update on public.shipments
  for each row execute function public.touch_updated_at();

-- Audit and settings ----------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  actor_role public.app_role,
  action text not null,                 -- e.g. 'player.suspend', 'role.change', 'box.publish'
  target_type text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

insert into public.settings (key, value) values
  ('sell_back_rate', '0.9'),
  ('starting_balance_cents', '0'),
  ('min_withdrawal_cents', '2000'),
  ('max_deposit_cents', '1000000'),
  -- 'demo': deposits complete instantly so the front end can integrate before a payment
  -- processor exists. 'live': deposits stay pending until the processor's webhook settles them.
  ('payments_mode', '"demo"');

-- Grail Noir: player management after the reference back office (docs/09-backoffice-reference.md).
-- Player numbers, staff comments, tags and player locks. A lock decides the account status:
-- an SB lock (self-exclusion) wins, then a CS lock (staff), otherwise the account is active.

alter table public.profiles add column player_number bigint generated always as identity (start with 100000) unique;

create type public.lock_type as enum ('cs', 'sb');

create table public.player_comments (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id),
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index player_comments_player_idx on public.player_comments (player_id, created_at desc);

create table public.player_tags (
  player_id uuid not null references public.profiles (id) on delete cascade,
  tag text not null check (tag ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$'),
  added_by uuid references public.profiles (id),
  added_at timestamptz not null default now(),
  primary key (player_id, tag)
);

create table public.player_locks (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles (id) on delete cascade,
  type public.lock_type not null,
  reason text not null check (length(btrim(reason)) > 0),
  comment text not null default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  removed_by uuid references public.profiles (id),
  removed_at timestamptz
);
create index player_locks_active_idx on public.player_locks (player_id) where removed_at is null;

alter table public.player_comments enable row level security;
alter table public.player_tags enable row level security;
alter table public.player_locks enable row level security;

create policy "player_comments: staff" on public.player_comments for select to authenticated using ((select public.is_staff()));
create policy "player_tags: staff" on public.player_tags for select to authenticated using ((select public.is_staff()));
create policy "player_locks: staff, or own" on public.player_locks
  for select to authenticated using (player_id = (select auth.uid()) or (select public.is_staff()));

revoke insert, update, delete on public.player_comments, public.player_tags, public.player_locks from anon, authenticated;
revoke select on public.player_comments, public.player_tags from anon;

-- Helpers ------------------------------------------------------------------------------------------

create function public._status_from_locks(p_player uuid) returns public.account_status
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.player_locks where player_id = p_player and type = 'sb' and removed_at is null) then 'self_excluded'
    when exists (select 1 from public.player_locks where player_id = p_player and type = 'cs' and removed_at is null) then 'suspended'
    else 'active'
  end::public.account_status
$$;

-- Staff may act on players; only a super admin on staff accounts; nobody on themselves.
create function public._assert_can_manage(p_player uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_role public.app_role;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  if p_player = auth.uid() then
    raise exception 'cannot_change_self';
  end if;
  select role into v_role from public.user_roles where user_id = p_player;
  if v_role is null then
    raise exception 'player_not_found';
  end if;
  if v_role <> 'player' and not public.is_super_admin() then
    raise exception 'forbidden';
  end if;
end;
$$;

-- Staff actions --------------------------------------------------------------------------------------

create function public.admin_lock_player(p_player_id uuid, p_type public.lock_type, p_reason text, p_comment text default '')
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  perform public._assert_can_manage(p_player_id);
  insert into public.player_locks (player_id, type, reason, comment, created_by)
  values (p_player_id, p_type, btrim(p_reason), coalesce(btrim(p_comment), ''), auth.uid())
  returning id into v_id;
  update public.profiles set status = public._status_from_locks(p_player_id) where id = p_player_id;
  perform public._audit('player.lock', 'profile', p_player_id::text,
    jsonb_build_object('lock', p_type, 'reason', p_reason, 'comment', p_comment, 'lock_id', v_id));
  return v_id;
end;
$$;

create function public.admin_unlock_player(p_lock_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_lock public.player_locks;
begin
  select * into v_lock from public.player_locks where id = p_lock_id and removed_at is null for update;
  if not found then
    raise exception 'lock_not_found';
  end if;
  perform public._assert_can_manage(v_lock.player_id);
  update public.player_locks set removed_at = now(), removed_by = auth.uid() where id = p_lock_id;
  update public.profiles set status = public._status_from_locks(v_lock.player_id) where id = v_lock.player_id;
  perform public._audit('player.unlock', 'profile', v_lock.player_id::text,
    jsonb_build_object('lock', v_lock.type, 'reason', v_lock.reason, 'lock_id', p_lock_id));
end;
$$;

create function public.admin_add_comment(p_player_id uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  insert into public.player_comments (player_id, author_id, body) values (p_player_id, auth.uid(), btrim(p_body))
  returning id into v_id;
  perform public._audit('player.comment', 'profile', p_player_id::text, jsonb_build_object('comment_id', v_id));
  return v_id;
end;
$$;

-- Replaces the player's manual tags with p_tags (automatic tags are computed, not stored).
create function public.admin_set_tags(p_player_id uuid, p_tags text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before text[];
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select coalesce(array_agg(tag order by tag), '{}') into v_before from public.player_tags where player_id = p_player_id;
  delete from public.player_tags where player_id = p_player_id and not (tag = any (coalesce(p_tags, '{}')));
  insert into public.player_tags (player_id, tag, added_by)
  select p_player_id, t, auth.uid() from unnest(coalesce(p_tags, '{}')) as t
  on conflict do nothing;
  perform public._audit('player.tags', 'profile', p_player_id::text, jsonb_build_object('from', v_before, 'to', p_tags));
end;
$$;

-- Player-facing: self-exclusion (responsible play). Only staff can lift it, after the period.
create function public.self_exclude(p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
begin
  insert into public.player_locks (player_id, type, reason, created_by) values (v_user, 'sb', coalesce(nullif(btrim(p_reason), ''), 'Player request'), v_user);
  update public.profiles set status = 'self_excluded' where id = v_user;
end;
$$;

-- The overview gains the player number (appended, so the earlier columns keep their order).
create or replace view public.admin_player_overview with (security_invoker = true) as
select
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.phone_dial,
  p.phone_number,
  p.state,
  p.status,
  p.kyc_status,
  p.marketing_opt_in,
  p.created_at as registered_at,
  p.last_seen_at,
  o.openings,
  o.played_cents,
  o.earned_cents,
  o.played_cents - o.earned_cents as house_net_cents,
  o.first_played_at,
  o.last_played_at,
  t.sold_back_cents,
  t.deposits_cents,
  t.withdrawals_cents,
  w.balance_cents,
  p.player_number
from public.profiles p
join public.user_roles r on r.user_id = p.id and r.role = 'player'
join public.wallets w on w.user_id = p.id
cross join lateral (
  select count(*)::integer as openings,
         coalesce(sum(price_cents), 0)::bigint as played_cents,
         coalesce(sum(item_value_cents), 0)::bigint as earned_cents,
         min(created_at) as first_played_at,
         max(created_at) as last_played_at
  from public.openings where user_id = p.id
) o
cross join lateral (
  select coalesce(sum(amount_cents) filter (where type = 'sell_back' and status = 'completed'), 0)::bigint as sold_back_cents,
         coalesce(sum(amount_cents) filter (where type = 'deposit' and status = 'completed'), 0)::bigint as deposits_cents,
         coalesce(-sum(amount_cents) filter (where type = 'withdrawal' and status = 'completed'), 0)::bigint as withdrawals_cents
  from public.transactions where user_id = p.id
) t
where (select public.is_staff());

-- Privileges ----------------------------------------------------------------------------------------

revoke execute on function public._status_from_locks(uuid), public._assert_can_manage(uuid) from public, anon, authenticated;
revoke execute on function
  public.admin_lock_player(uuid, public.lock_type, text, text),
  public.admin_unlock_player(bigint),
  public.admin_add_comment(uuid, text),
  public.admin_set_tags(uuid, text[]),
  public.self_exclude(text)
from public, anon;
grant execute on function
  public.admin_lock_player(uuid, public.lock_type, text, text),
  public.admin_unlock_player(bigint),
  public.admin_add_comment(uuid, text),
  public.admin_set_tags(uuid, text[]),
  public.self_exclude(text)
to authenticated;

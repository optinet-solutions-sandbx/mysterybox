-- Grail Noir: back office (reporting views and staff actions).
--
-- Definitions shared with the back-office UI (web/src/domain/analytics.ts mirrors them):
--   played    = sum of box prices paid (turnover)
--   earned    = sum of the listed values of the pieces players received
--   house net = played - earned (gross gaming revenue on listed value); hold % = house net / played
--   a player has "played" once they have at least one opening
-- Only accounts with role 'player' count towards metrics; staff accounts are excluded.

-- Public odds view: back-office weights and the rounded odds players see, from the same rows ------

create view public.box_odds with (security_invoker = true) as
select
  bi.box_id,
  bi.item_id,
  bi.position,
  bi.weight,
  b.odds_scale,
  bi.weight::numeric / b.odds_scale as probability,
  (sum(bi.weight) over w - bi.weight)::integer as roll_from,
  (sum(bi.weight) over w - 1)::integer as roll_to
from public.box_items bi
join public.boxes b on b.id = bi.box_id
window w as (partition by bi.box_id order by bi.position rows between unbounded preceding and current row);

-- Player overview (one row per player) -----------------------------------------------------------

create view public.admin_player_overview with (security_invoker = true) as
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
  w.balance_cents
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

-- Staff list ---------------------------------------------------------------------------------------

create view public.admin_staff as
select p.id, p.email, p.first_name, p.last_name, r.role, r.granted_at, r.granted_by, p.status, p.last_seen_at
from public.profiles p
join public.user_roles r on r.user_id = p.id and r.role <> 'player'
where (select public.is_staff());
alter view public.admin_staff set (security_invoker = true);

-- Daily metrics for a date range (UTC days) -------------------------------------------------------

create function public.admin_daily_metrics(p_from date, p_to date)
returns table (
  day date,
  registrations integer,
  players_played integer,
  first_time_players integer,
  openings integer,
  played_cents bigint,
  earned_cents bigint,
  deposits_cents bigint,
  withdrawals_cents bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  return query
  with players as (
    select user_id from public.user_roles where role = 'player'
  ),
  days as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  ),
  regs as (
    select (p.created_at at time zone 'utc')::date as day, count(*)::integer as n
    from public.profiles p join players pl on pl.user_id = p.id
    group by 1
  ),
  opens as (
    select (o.created_at at time zone 'utc')::date as day,
           count(distinct o.user_id)::integer as players,
           count(*)::integer as n,
           sum(o.price_cents)::bigint as played,
           sum(o.item_value_cents)::bigint as earned
    from public.openings o join players pl on pl.user_id = o.user_id
    group by 1
  ),
  firsts as (
    select (min(o.created_at) at time zone 'utc')::date as day, o.user_id
    from public.openings o join players pl on pl.user_id = o.user_id
    group by o.user_id
  ),
  money as (
    select (t.created_at at time zone 'utc')::date as day,
           sum(t.amount_cents) filter (where t.type = 'deposit')::bigint as deposits,
           (-sum(t.amount_cents) filter (where t.type = 'withdrawal'))::bigint as withdrawals
    from public.transactions t join players pl on pl.user_id = t.user_id
    where t.status = 'completed'
    group by 1
  )
  select
    d.day,
    coalesce(r.n, 0),
    coalesce(o.players, 0),
    coalesce((select count(*)::integer from firsts f where f.day = d.day), 0),
    coalesce(o.n, 0),
    coalesce(o.played, 0),
    coalesce(o.earned, 0),
    coalesce(m.deposits, 0),
    coalesce(m.withdrawals, 0)
  from days d
  left join regs r on r.day = d.day
  left join opens o on o.day = d.day
  left join money m on m.day = d.day
  order by d.day;
end;
$$;

-- Headline numbers for the dashboard --------------------------------------------------------------

create function public.admin_kpis(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_from timestamptz := (p_from::timestamp at time zone 'utc');
  v_to timestamptz := ((p_to + 1)::timestamp at time zone 'utc');
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  with players as (
    select p.id, p.created_at from public.profiles p
    join public.user_roles r on r.user_id = p.id and r.role = 'player'
  ),
  ranged as (
    select o.* from public.openings o join players pl on pl.id = o.user_id
    where o.created_at >= v_from and o.created_at < v_to
  ),
  ever as (
    select count(distinct o.user_id) as n from public.openings o join players pl on pl.id = o.user_id
  ),
  money as (
    select
      coalesce(sum(t.amount_cents) filter (where t.type = 'deposit'), 0) as deposits,
      coalesce(-sum(t.amount_cents) filter (where t.type = 'withdrawal'), 0) as withdrawals,
      coalesce(sum(t.amount_cents) filter (where t.type = 'sell_back'), 0) as sold_back
    from public.transactions t join players pl on pl.id = t.user_id
    where t.status = 'completed' and t.created_at >= v_from and t.created_at < v_to
  )
  select jsonb_build_object(
    'registered_total', (select count(*) from players),
    'registered_in_range', (select count(*) from players where created_at >= v_from and created_at < v_to),
    'players_played_ever', (select n from ever),
    'players_played_in_range', (select count(distinct user_id) from ranged),
    'openings', (select count(*) from ranged),
    'played_cents', (select coalesce(sum(price_cents), 0) from ranged),
    'earned_cents', (select coalesce(sum(item_value_cents), 0) from ranged),
    'house_net_cents', (select coalesce(sum(price_cents - item_value_cents), 0) from ranged),
    'deposits_cents', (select deposits from money),
    'withdrawals_cents', (select withdrawals from money),
    'sold_back_cents', (select sold_back from money),
    'pending_withdrawals', (
      select count(*) from public.transactions where type = 'withdrawal' and status = 'pending'
    )
  ) into v_result;
  return v_result;
end;
$$;

-- Box performance: configured vs actual return ----------------------------------------------------

create function public.admin_box_performance(p_from date, p_to date)
returns table (
  box_id text,
  name text,
  status public.box_status,
  price_cents bigint,
  expected_rtp numeric,
  openings integer,
  played_cents bigint,
  earned_cents bigint,
  actual_rtp numeric
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_from timestamptz := (p_from::timestamp at time zone 'utc');
  v_to timestamptz := ((p_to + 1)::timestamp at time zone 'utc');
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  return query
  select
    b.id,
    b.name,
    b.status,
    b.price_cents,
    round((select sum(bi.weight::numeric * i.value_cents) from public.box_items bi join public.items i on i.id = bi.item_id where bi.box_id = b.id)
          / b.odds_scale / b.price_cents, 4),
    coalesce(o.n, 0),
    coalesce(o.played, 0),
    coalesce(o.earned, 0),
    case when coalesce(o.played, 0) > 0 then round(o.earned::numeric / o.played, 4) end
  from public.boxes b
  left join (
    select op.box_id, count(*)::integer as n, sum(op.price_cents)::bigint as played, sum(op.item_value_cents)::bigint as earned
    from public.openings op
    join public.user_roles r on r.user_id = op.user_id and r.role = 'player'
    where op.created_at >= v_from and op.created_at < v_to
    group by op.box_id
  ) o on o.box_id = b.id
  order by b.sort_order, b.price_cents;
end;
$$;

-- Staff actions (every one is audited) --------------------------------------------------------------

-- Admins and super admins: suspend / reactivate players. Only a super admin can change a staff
-- member's status.
create function public.admin_set_player_status(p_user_id uuid, p_status public.account_status, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.account_status;
  v_target_role public.app_role;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_self';
  end if;
  select p.status, r.role into v_old, v_target_role
  from public.profiles p join public.user_roles r on r.user_id = p.id
  where p.id = p_user_id for update of p;
  if not found then
    raise exception 'player_not_found';
  end if;
  if v_target_role <> 'player' and not public.is_super_admin() then
    raise exception 'forbidden';
  end if;
  update public.profiles set status = p_status where id = p_user_id;
  perform public._audit('player.status', 'profile', p_user_id::text,
    jsonb_build_object('from', v_old, 'to', p_status, 'reason', p_reason));
end;
$$;

-- Super admin only. A super admin can't change their own role, and the last super admin stays.
create function public.admin_set_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.app_role;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_self';
  end if;
  select role into v_old from public.user_roles where user_id = p_user_id for update;
  if not found then
    raise exception 'player_not_found';
  end if;
  if v_old = 'super_admin' and p_role <> 'super_admin'
     and (select count(*) from public.user_roles where role = 'super_admin') <= 1 then
    raise exception 'last_super_admin';
  end if;
  update public.user_roles set role = p_role, granted_by = auth.uid(), granted_at = now() where user_id = p_user_id;
  perform public._audit('role.change', 'profile', p_user_id::text, jsonb_build_object('from', v_old, 'to', p_role));
end;
$$;

-- Super admin only: goodwill credits and corrections. Never below zero.
create function public.admin_adjust_balance(p_user_id uuid, p_amount_cents bigint, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_balance bigint;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;
  if p_amount_cents is null or p_amount_cents = 0 or coalesce(btrim(p_note), '') = '' then
    raise exception 'invalid_adjustment';
  end if;
  update public.wallets set balance_cents = balance_cents + p_amount_cents, updated_at = now()
  where user_id = p_user_id returning balance_cents into v_balance;
  if not found then
    raise exception 'player_not_found';
  end if;
  insert into public.transactions (user_id, type, amount_cents, balance_after_cents, note, created_by, completed_at)
  values (p_user_id, 'adjustment', p_amount_cents, v_balance, p_note, auth.uid(), now());
  perform public._audit('wallet.adjust', 'profile', p_user_id::text, jsonb_build_object('amount_cents', p_amount_cents, 'note', p_note));
  return jsonb_build_object('balance_cents', v_balance);
end;
$$;

-- Staff, or the payment processor's webhook (service role): settle a pending deposit / withdrawal.
create function public.admin_settle_transaction(p_transaction_id uuid, p_outcome public.transaction_status) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not public.is_staff() and not public.is_service_role() then
    raise exception 'forbidden';
  end if;
  v_result := public._settle(p_transaction_id, p_outcome, auth.uid());
  perform public._audit('transaction.settle', 'transaction', p_transaction_id::text, jsonb_build_object('outcome', p_outcome));
  return v_result;
end;
$$;

-- Staff: move a shipment along. Inventory status follows.
create function public.admin_update_shipment(
  p_shipment_id uuid,
  p_status public.shipment_status,
  p_carrier text default null,
  p_tracking_number text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_inventory uuid;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  update public.shipments
  set status = p_status,
      carrier = coalesce(p_carrier, carrier),
      tracking_number = coalesce(p_tracking_number, tracking_number)
  where id = p_shipment_id
  returning inventory_item_id into v_inventory;
  if not found then
    raise exception 'shipment_not_found';
  end if;
  update public.inventory_items
  set status = case p_status
    when 'requested' then 'shipping_pending'
    when 'processing' then 'shipping_processing'
    when 'shipped' then 'shipped'
    when 'delivered' then 'delivered'
    when 'cancelled' then 'held'
  end::public.inventory_status
  where id = v_inventory;
  perform public._audit('shipment.update', 'shipment', p_shipment_id::text, jsonb_build_object('status', p_status));
end;
$$;

-- Staff: publish, unpublish or retire a box (publishing re-checks that the odds sum).
create function public.admin_set_box_status(p_box_id text, p_status public.box_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.box_status;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select status into v_old from public.boxes where id = p_box_id for update;
  if not found then
    raise exception 'box_not_found';
  end if;
  update public.boxes set status = p_status where id = p_box_id;
  perform public._audit('box.status', 'box', p_box_id, jsonb_build_object('from', v_old, 'to', p_status));
end;
$$;

-- Privileges ------------------------------------------------------------------------------------

revoke all on public.admin_player_overview, public.admin_staff from anon;
grant select on public.admin_player_overview, public.admin_staff to authenticated;
grant select on public.box_odds to anon, authenticated;

revoke execute on function
  public.admin_daily_metrics(date, date),
  public.admin_kpis(date, date),
  public.admin_box_performance(date, date),
  public.admin_set_player_status(uuid, public.account_status, text),
  public.admin_set_role(uuid, public.app_role),
  public.admin_adjust_balance(uuid, bigint, text),
  public.admin_settle_transaction(uuid, public.transaction_status),
  public.admin_update_shipment(uuid, public.shipment_status, text, text),
  public.admin_set_box_status(text, public.box_status)
from public, anon;

grant execute on function
  public.admin_daily_metrics(date, date),
  public.admin_kpis(date, date),
  public.admin_box_performance(date, date),
  public.admin_set_player_status(uuid, public.account_status, text),
  public.admin_set_role(uuid, public.app_role),
  public.admin_adjust_balance(uuid, bigint, text),
  public.admin_settle_transaction(uuid, public.transaction_status),
  public.admin_update_shipment(uuid, public.shipment_status, text, text),
  public.admin_set_box_status(text, public.box_status)
to authenticated, service_role;

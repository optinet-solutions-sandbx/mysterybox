-- Grail Noir: wallet and play functions (the player-facing RPCs).
--
-- Every balance change happens here, inside one transaction, and writes its ledger row.
-- Errors are raised with a stable code as the message (insufficient_funds, account_not_active,
-- ...); the front end maps them (see web/src/backend/contract.ts, BackendErrorCode).
--
-- Deposits and withdrawals are PLACEHOLDERS until a payment processor is chosen: they create
-- pending transactions; settings.payments_mode = 'demo' completes deposits at once.
--
-- The draw reproduces web/src/domain/fair.ts exactly:
--   roll = floor(u32(first 4 bytes of HMAC-SHA256(key = server_seed, msg = client_seed:nonce)) * scale / 2^32)
--   item = first box_items row (by position) whose cumulative weight exceeds roll

-- Internal helpers (not callable by clients) ----------------------------------------------------

create function public._setting(p_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.settings where key = p_key
$$;

create function public._audit(p_action text, p_target_type text, p_target_id text, p_detail jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id, detail)
  values (auth.uid(), public.current_app_role(), p_action, p_target_type, p_target_id, coalesce(p_detail, '{}'::jsonb))
$$;

-- The caller must be a signed-in, active player. Staff accounts don't play or move money.
create function public._require_player() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_status public.account_status;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  select status into v_status from public.profiles where id = v_user;
  if v_status is distinct from 'active' then
    raise exception 'account_not_active';
  end if;
  if public.current_app_role() <> 'player' then
    raise exception 'staff_account';
  end if;
  return v_user;
end;
$$;

-- The player's active seed pair, locked; created (and its hash committed) on first use.
create function public._active_seed_pair(p_user uuid) returns public.seed_pairs
language plpgsql security definer set search_path = '' as $$
declare
  v_pair public.seed_pairs;
  v_server text;
begin
  select * into v_pair from public.seed_pairs where user_id = p_user and active for update;
  if not found then
    v_server := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.seed_pairs (user_id, server_seed, server_seed_hash, client_seed)
    values (p_user, v_server, encode(extensions.digest(v_server, 'sha256'), 'hex'), encode(extensions.gen_random_bytes(8), 'hex'))
    returning * into v_pair;
  end if;
  return v_pair;
end;
$$;

-- Settles a pending deposit or withdrawal. Called by request_deposit (demo mode),
-- cancel_withdrawal and admin_settle_transaction.
create function public._settle(p_tx uuid, p_outcome public.transaction_status, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_tx public.transactions;
  v_balance bigint;
begin
  select * into v_tx from public.transactions where id = p_tx for update;
  if not found then
    raise exception 'transaction_not_found';
  end if;
  if v_tx.status <> 'pending' then
    raise exception 'transaction_not_pending';
  end if;
  if p_outcome not in ('completed', 'failed', 'cancelled') then
    raise exception 'invalid_outcome';
  end if;

  if v_tx.type = 'deposit' then
    if p_outcome = 'completed' then
      update public.wallets set balance_cents = balance_cents + v_tx.amount_cents, updated_at = now()
      where user_id = v_tx.user_id returning balance_cents into v_balance;
    end if;
  elsif v_tx.type = 'withdrawal' then
    -- amount_cents is negative; its absolute value has been held since the request.
    if p_outcome = 'completed' then
      update public.wallets set held_cents = held_cents + v_tx.amount_cents, updated_at = now()
      where user_id = v_tx.user_id returning balance_cents into v_balance;
    else
      update public.wallets
      set held_cents = held_cents + v_tx.amount_cents, balance_cents = balance_cents - v_tx.amount_cents, updated_at = now()
      where user_id = v_tx.user_id returning balance_cents into v_balance;
    end if;
  else
    raise exception 'not_settleable';
  end if;

  if v_balance is null then
    select balance_cents into v_balance from public.wallets where user_id = v_tx.user_id;
  end if;

  update public.transactions
  set status = p_outcome,
      completed_at = now(),
      balance_after_cents = case when v_tx.type = 'deposit' and p_outcome = 'completed' then v_balance else balance_after_cents end,
      created_by = coalesce(created_by, p_actor)
  where id = p_tx;

  return jsonb_build_object('transaction_id', p_tx, 'status', p_outcome, 'balance_cents', v_balance);
end;
$$;

-- Pure draw functions (public: the provably-fair verifier uses them) ---------------------------

create function public.compute_roll(p_server_seed text, p_client_seed text, p_nonce integer, p_scale integer default 100000)
returns integer
language sql immutable strict set search_path = '' as $$
  select (
    ('x' || lpad(substr(encode(extensions.hmac(p_client_seed || ':' || p_nonce::text, p_server_seed, 'sha256'), 'hex'), 1, 8), 16, '0'))::bit(64)::bigint
    * p_scale / 4294967296
  )::integer
$$;

create function public.pick_item(p_box_id text, p_roll integer) returns text
language sql stable set search_path = '' as $$
  select item_id
  from (
    select item_id, sum(weight) over (order by position rows between unbounded preceding and current row) as cumulative
    from public.box_items
    where box_id = p_box_id
  ) ranked
  where p_roll < cumulative
  order by cumulative
  limit 1
$$;

create function public.verify_roll(p_server_seed text, p_client_seed text, p_nonce integer, p_box_id text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_scale integer;
  v_roll integer;
begin
  select odds_scale into v_scale from public.boxes where id = p_box_id;
  if v_scale is null then
    raise exception 'box_not_available';
  end if;
  v_roll := public.compute_roll(p_server_seed, p_client_seed, p_nonce, v_scale);
  return jsonb_build_object(
    'roll', v_roll,
    'item_id', public.pick_item(p_box_id, v_roll),
    'server_seed_hash', encode(extensions.digest(p_server_seed, 'sha256'), 'hex')
  );
end;
$$;

-- Player card -----------------------------------------------------------------------------------

-- The player's own card, or any player's for staff (the back office drawer).
create function public.get_player_card(p_user_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_target uuid := coalesce(p_user_id, auth.uid());
  v_card jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if v_target <> auth.uid() and not public.is_staff() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'phone', jsonb_build_object('country', p.phone_country, 'dial', p.phone_dial, 'number', p.phone_number),
    'state', p.state,
    'role', r.role,
    'status', p.status,
    'kyc_status', p.kyc_status,
    'marketing_opt_in', p.marketing_opt_in,
    'registered_at', p.created_at,
    'last_seen_at', p.last_seen_at,
    'wallet', jsonb_build_object('balance_cents', w.balance_cents, 'held_cents', w.held_cents, 'currency', w.currency),
    'stats', jsonb_build_object(
      'openings', o.openings,
      'played_cents', o.played_cents,
      'earned_cents', o.earned_cents,
      'house_net_cents', o.played_cents - o.earned_cents,
      'first_played_at', o.first_played_at,
      'last_played_at', o.last_played_at,
      'sold_back_cents', t.sold_back_cents,
      'deposits_cents', t.deposits_cents,
      'withdrawals_cents', t.withdrawals_cents,
      'pieces_held', (select count(*) from public.inventory_items i where i.user_id = p.id and i.status = 'held')
    )
  )
  into v_card
  from public.profiles p
  join public.user_roles r on r.user_id = p.id
  join public.wallets w on w.user_id = p.id
  cross join lateral (
    select count(*) as openings,
           coalesce(sum(price_cents), 0) as played_cents,
           coalesce(sum(item_value_cents), 0) as earned_cents,
           min(created_at) as first_played_at,
           max(created_at) as last_played_at
    from public.openings where user_id = p.id
  ) o
  cross join lateral (
    select coalesce(sum(amount_cents) filter (where type = 'sell_back' and status = 'completed'), 0) as sold_back_cents,
           coalesce(sum(amount_cents) filter (where type = 'deposit' and status = 'completed'), 0) as deposits_cents,
           coalesce(-sum(amount_cents) filter (where type = 'withdrawal' and status = 'completed'), 0) as withdrawals_cents
    from public.transactions where user_id = p.id
  ) t
  where p.id = v_target;

  if v_card is null then
    raise exception 'player_not_found';
  end if;
  return v_card;
end;
$$;

create function public.touch_last_seen() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set last_seen_at = now() where id = auth.uid()
$$;

-- Deposits and withdrawals (placeholders) --------------------------------------------------------

create function public.request_deposit(p_amount_cents bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_max bigint := coalesce((public._setting('max_deposit_cents') #>> '{}')::bigint, 1000000);
  v_tx uuid;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;
  if p_amount_cents > v_max then
    raise exception 'amount_above_limit';
  end if;

  insert into public.transactions (user_id, type, status, amount_cents, note)
  values (v_user, 'deposit', 'pending', p_amount_cents, 'Deposit')
  returning id into v_tx;

  if (public._setting('payments_mode') #>> '{}') = 'demo' then
    return public._settle(v_tx, 'completed', null);
  end if;
  -- TODO(payments): create the processor's checkout session here and return its redirect URL.
  return jsonb_build_object(
    'transaction_id', v_tx,
    'status', 'pending',
    'balance_cents', (select balance_cents from public.wallets where user_id = v_user)
  );
end;
$$;

create function public.request_withdrawal(p_amount_cents bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_min bigint := coalesce((public._setting('min_withdrawal_cents') #>> '{}')::bigint, 0);
  v_kyc public.kyc_status;
  v_balance bigint;
  v_tx uuid;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;
  if p_amount_cents < v_min then
    raise exception 'amount_below_minimum';
  end if;
  select kyc_status into v_kyc from public.profiles where id = v_user;
  if (public._setting('payments_mode') #>> '{}') <> 'demo' and v_kyc <> 'verified' then
    raise exception 'kyc_required';
  end if;

  select balance_cents into v_balance from public.wallets where user_id = v_user for update;
  if v_balance < p_amount_cents then
    raise exception 'insufficient_funds';
  end if;

  update public.wallets
  set balance_cents = balance_cents - p_amount_cents, held_cents = held_cents + p_amount_cents, updated_at = now()
  where user_id = v_user
  returning balance_cents into v_balance;

  -- Always pending: staff or the processor's payout webhook settles it (admin_settle_transaction).
  insert into public.transactions (user_id, type, status, amount_cents, balance_after_cents, note)
  values (v_user, 'withdrawal', 'pending', -p_amount_cents, v_balance, 'Withdrawal requested')
  returning id into v_tx;

  return jsonb_build_object('transaction_id', v_tx, 'status', 'pending', 'balance_cents', v_balance);
end;
$$;

create function public.cancel_withdrawal(p_transaction_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
begin
  if not exists (
    select 1 from public.transactions
    where id = p_transaction_id and user_id = v_user and type = 'withdrawal' and status = 'pending'
  ) then
    raise exception 'transaction_not_pending';
  end if;
  return public._settle(p_transaction_id, 'cancelled', v_user);
end;
$$;

-- Opening a box ----------------------------------------------------------------------------------

create function public.open_box(p_box_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_box public.boxes;
  v_pair public.seed_pairs;
  v_balance bigint;
  v_roll integer;
  v_item public.items;
  v_opening uuid;
  v_inventory uuid;
begin
  select * into v_box from public.boxes where id = p_box_id and status = 'live';
  if not found then
    raise exception 'box_not_available';
  end if;

  select balance_cents into v_balance from public.wallets where user_id = v_user for update;
  if v_balance < v_box.price_cents then
    raise exception 'insufficient_funds';
  end if;

  -- The outcome is fixed by the committed seed pair before anything is shown.
  v_pair := public._active_seed_pair(v_user);
  v_roll := public.compute_roll(v_pair.server_seed, v_pair.client_seed, v_pair.nonce, v_box.odds_scale);
  select * into v_item from public.items where id = public.pick_item(v_box.id, v_roll);
  if not found then
    raise exception 'odds_misconfigured';
  end if;

  update public.seed_pairs set nonce = nonce + 1 where id = v_pair.id;
  update public.wallets set balance_cents = balance_cents - v_box.price_cents, updated_at = now()
  where user_id = v_user returning balance_cents into v_balance;

  insert into public.openings (user_id, box_id, item_id, price_cents, item_value_cents, roll, seed_pair_id, server_seed_hash, client_seed, nonce)
  values (v_user, v_box.id, v_item.id, v_box.price_cents, v_item.value_cents, v_roll, v_pair.id, v_pair.server_seed_hash, v_pair.client_seed, v_pair.nonce)
  returning id into v_opening;

  insert into public.inventory_items (user_id, item_id, opening_id)
  values (v_user, v_item.id, v_opening)
  returning id into v_inventory;

  insert into public.transactions (user_id, type, amount_cents, balance_after_cents, opening_id, note, completed_at)
  values (v_user, 'box_open', -v_box.price_cents, v_balance, v_opening, 'Opened ' || v_box.name, now());

  return jsonb_build_object(
    'opening_id', v_opening,
    'inventory_item_id', v_inventory,
    'item_id', v_item.id,
    'item_value_cents', v_item.value_cents,
    'roll', v_roll,
    'nonce', v_pair.nonce,
    'client_seed', v_pair.client_seed,
    'server_seed_hash', v_pair.server_seed_hash,
    'balance_cents', v_balance
  );
end;
$$;

-- Inventory: sell back, ship ---------------------------------------------------------------------

create function public.sell_back(p_inventory_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_rate numeric := coalesce((public._setting('sell_back_rate') #>> '{}')::numeric, 0.9);
  v_credit bigint := 0;
  v_count integer := 0;
  v_first uuid;
  v_balance bigint;
  v_each bigint;
  r record;
begin
  for r in
    select inv.id, i.value_cents
    from public.inventory_items inv
    join public.items i on i.id = inv.item_id
    where inv.id = any(p_inventory_ids) and inv.user_id = v_user and inv.status = 'held'
    for update of inv
  loop
    v_each := floor(r.value_cents * v_rate)::bigint;   -- same rounding as sellBackValue()
    update public.inventory_items set status = 'sold', sell_back_cents = v_each where id = r.id;
    v_credit := v_credit + v_each;
    v_count := v_count + 1;
    v_first := coalesce(v_first, r.id);
  end loop;

  if v_count = 0 then
    raise exception 'nothing_to_sell';
  end if;

  update public.wallets set balance_cents = balance_cents + v_credit, updated_at = now()
  where user_id = v_user returning balance_cents into v_balance;

  insert into public.transactions (user_id, type, amount_cents, balance_after_cents, inventory_item_id, note, completed_at)
  values (
    v_user, 'sell_back', v_credit, v_balance,
    case when v_count = 1 then v_first end,
    case when v_count = 1 then 'Sold back 1 item' else 'Sold back ' || v_count || ' items' end,
    now()
  );

  return jsonb_build_object('credited_cents', v_credit, 'sold', v_count, 'balance_cents', v_balance);
end;
$$;

create function public.request_shipping(p_inventory_id uuid, p_address jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_category public.item_category;
  v_shipment uuid;
begin
  select i.category into v_category
  from public.inventory_items inv join public.items i on i.id = inv.item_id
  where inv.id = p_inventory_id and inv.user_id = v_user and inv.status = 'held'
  for update of inv;
  if not found then
    raise exception 'item_not_held';
  end if;
  if v_category = 'credit' then
    raise exception 'not_shippable';
  end if;

  -- TODO(fulfilment): validate the US address and quote shipping once the carrier is chosen.
  insert into public.shipments (inventory_item_id, user_id, address)
  values (p_inventory_id, v_user, coalesce(p_address, '{}'::jsonb))
  returning id into v_shipment;
  update public.inventory_items set status = 'shipping_pending' where id = p_inventory_id;

  return jsonb_build_object('shipment_id', v_shipment, 'status', 'requested');
end;
$$;

-- Only while the request is still pending; once operations pick it up it goes through support.
create function public.cancel_shipping(p_inventory_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_shipment uuid;
begin
  select s.id into v_shipment
  from public.shipments s
  where s.inventory_item_id = p_inventory_id and s.user_id = v_user and s.status = 'requested'
  for update;
  if not found then
    raise exception 'shipment_not_cancellable';
  end if;
  update public.shipments set status = 'cancelled' where id = v_shipment;
  update public.inventory_items set status = 'held' where id = p_inventory_id;
  return jsonb_build_object('shipment_id', v_shipment, 'status', 'cancelled');
end;
$$;

-- Seeds -----------------------------------------------------------------------------------------

create function public.get_my_seeds() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_pair public.seed_pairs;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  v_pair := public._active_seed_pair(v_user);
  return jsonb_build_object(
    'active', jsonb_build_object('server_seed_hash', v_pair.server_seed_hash, 'client_seed', v_pair.client_seed, 'nonce', v_pair.nonce),
    'revealed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'server_seed', s.server_seed, 'server_seed_hash', s.server_seed_hash,
        'client_seed', s.client_seed, 'nonce', s.nonce, 'revealed_at', s.revealed_at
      ) order by s.revealed_at desc)
      from (
        select * from public.seed_pairs
        where user_id = v_user and not active
        order by revealed_at desc
        limit 10
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create function public.set_client_seed(p_client_seed text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_seed text := btrim(coalesce(p_client_seed, ''));
  v_pair public.seed_pairs;
begin
  if length(v_seed) = 0 or length(v_seed) > 64 then
    raise exception 'invalid_client_seed';
  end if;
  v_pair := public._active_seed_pair(v_user);
  update public.seed_pairs set client_seed = v_seed where id = v_pair.id;
  return public.get_my_seeds();
end;
$$;

-- Reveals the current server seed and commits a new one (client seed carries over, nonce resets).
create function public.rotate_seeds() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_pair public.seed_pairs;
  v_server text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  v_pair := public._active_seed_pair(v_user);
  update public.seed_pairs set active = false, revealed_at = now() where id = v_pair.id;
  insert into public.seed_pairs (user_id, server_seed, server_seed_hash, client_seed)
  values (v_user, v_server, encode(extensions.digest(v_server, 'sha256'), 'hex'), v_pair.client_seed);
  return public.get_my_seeds();
end;
$$;

-- Function privileges ----------------------------------------------------------------------------
-- Supabase grants EXECUTE on new functions to anon and authenticated by default.

revoke execute on function
  public._setting(text),
  public._audit(text, text, text, jsonb),
  public._require_player(),
  public._active_seed_pair(uuid),
  public._settle(uuid, public.transaction_status, uuid),
  public.handle_new_user(),
  public.check_box_odds(),
  public.freeze_live_odds(),
  public.touch_updated_at()
from public, anon, authenticated;

revoke execute on function
  public.get_player_card(uuid),
  public.touch_last_seen(),
  public.request_deposit(bigint),
  public.request_withdrawal(bigint),
  public.cancel_withdrawal(uuid),
  public.open_box(text),
  public.sell_back(uuid[]),
  public.request_shipping(uuid, jsonb),
  public.cancel_shipping(uuid),
  public.get_my_seeds(),
  public.set_client_seed(text),
  public.rotate_seeds()
from public, anon;

grant execute on function
  public.get_player_card(uuid),
  public.touch_last_seen(),
  public.request_deposit(bigint),
  public.request_withdrawal(bigint),
  public.cancel_withdrawal(uuid),
  public.open_box(text),
  public.sell_back(uuid[]),
  public.request_shipping(uuid, jsonb),
  public.cancel_shipping(uuid),
  public.get_my_seeds(),
  public.set_client_seed(text),
  public.rotate_seeds()
to authenticated;

grant execute on function
  public.compute_roll(text, text, integer, integer),
  public.pick_item(text, integer),
  public.verify_roll(text, text, integer, text)
to anon, authenticated;

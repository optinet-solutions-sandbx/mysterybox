-- Grail Noir: the catalogue is edited in the back office.
--
-- * Categories are text, not enums. Each brand pack (web/public/brands/<id>/brand.json) lists its
--   niche's categories, so a new niche needs no migration. 'credit' (site credit, never shipped)
--   is built in; boxes may also be 'mixed'.
-- * Items carry their free spins (credit outcomes) and the product photo's aspect ratio; boxes carry
--   their free-spin table. The database now holds everything the draw and the odds pages need.
-- * Product photos live in the public 'catalog' storage bucket. Anyone can view them; only staff
--   can upload, replace or delete them.
-- * A live box's price and free-spin table are frozen like its odds: set it back to draft to change them.

-- Categories as text -----------------------------------------------------------------------------

alter table public.items alter column category type text using category::text;
alter table public.items add constraint items_category_format check (category ~ '^[a-z0-9-]{2,32}$');

alter table public.boxes alter column category drop default;
alter table public.boxes alter column category type text using category::text;
alter table public.boxes alter column category set default 'mixed';
alter table public.boxes add constraint boxes_category_format check (category ~ '^[a-z0-9-]{2,32}$' and category <> 'credit');

-- The one function that declared a variable of the old type.
create or replace function public.request_shipping(p_inventory_id uuid, p_address jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_player();
  v_category text;
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

drop type public.item_category;
drop type public.box_category;

-- Free spins, photo aspect, free-spin table --------------------------------------------------------

alter table public.items
  add column free_spins integer not null default 0 check (free_spins between 0 and 10),
  add column image_aspect numeric(6, 3) check (image_aspect > 0);
alter table public.items add constraint items_free_spins_credit check (free_spins = 0 or category = 'credit');

-- [{ "credits": 3, "percent": 70 }, …]: what one free spin pays, in credit, and its chance (sums to 100).
alter table public.boxes add column bonus jsonb not null default '[]'::jsonb check (jsonb_typeof(bonus) = 'array');

-- Bring the rows loaded from the first seed up to date (no-op on a fresh database: seed.sql runs after).
update public.items set free_spins = 1 where id ~ '^credit-[0-9]+-fs1$';
update public.items set free_spins = 2 where id ~ '^credit-[0-9]+-fs2$';
update public.boxes b set bonus = v.bonus::jsonb
from (values
  ('first-edition', '[{"credits":3,"percent":70},{"credits":6,"percent":22},{"credits":14,"percent":6},{"credits":28,"percent":1.8},{"credits":56,"percent":0.2}]'),
  ('beauty-cabinet', '[{"credits":11,"percent":70},{"credits":22,"percent":22},{"credits":55,"percent":6},{"credits":110,"percent":1.8},{"credits":220,"percent":0.2}]'),
  ('sun-club', '[{"credits":31,"percent":70},{"credits":63,"percent":22},{"credits":157,"percent":6},{"credits":314,"percent":1.8},{"credits":628,"percent":0.2}]'),
  ('atelier', '[{"credits":194,"percent":70},{"credits":388,"percent":22},{"credits":971,"percent":6},{"credits":1941,"percent":1.8},{"credits":3882,"percent":0.2}]'),
  ('flap-room', '[{"credits":197,"percent":70},{"credits":395,"percent":22},{"credits":987,"percent":6},{"credits":1973,"percent":1.8},{"credits":3946,"percent":0.2}]'),
  ('jewel-vault', '[{"credits":384,"percent":70},{"credits":767,"percent":22},{"credits":1919,"percent":6},{"credits":3837,"percent":1.8},{"credits":7674,"percent":0.2}]'),
  ('time-room', '[{"credits":531,"percent":70},{"credits":1062,"percent":22},{"credits":2654,"percent":6},{"credits":5308,"percent":1.8},{"credits":10616,"percent":0.2}]')
) as v(slug, bonus)
where b.slug = v.slug;

-- A live box's price and free-spin table are frozen -------------------------------------------------

create function public.freeze_live_price() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'live' and new.status = 'live'
     and (new.price_cents is distinct from old.price_cents or new.bonus is distinct from old.bonus) then
    raise exception 'price_frozen: box % is live; set it to draft before changing its price', old.id;
  end if;
  return new;
end;
$$;
create trigger boxes_freeze_price before update on public.boxes
  for each row execute function public.freeze_live_price();
revoke execute on function public.freeze_live_price() from public, anon, authenticated;

-- Product photos -----------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/png', 'image/webp', 'image/jpeg', 'image/avif'])
on conflict (id) do nothing;

create policy "catalog photos: staff upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'catalog' and (select public.is_staff()));
create policy "catalog photos: staff replace" on storage.objects
  for update to authenticated using (bucket_id = 'catalog' and (select public.is_staff()));
create policy "catalog photos: staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'catalog' and (select public.is_staff()));
create policy "catalog photos: staff list" on storage.objects
  for select to authenticated using (bucket_id = 'catalog' and (select public.is_staff()));

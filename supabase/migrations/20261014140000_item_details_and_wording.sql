-- Grail Noir: authenticity details per product, and "bonus open" instead of "free spin".
--
-- * Staff record a product's reference number, condition and how it was authenticated on the
--   back office's Items page; the site shows them on the opening result, inventory and box pages,
--   only when filled in. They describe the product, not a single physical piece (that comes with
--   real stock).
-- * The credit outcomes that carry an extra roll are renamed from "+ Free Spin" to "+ Bonus Open"
--   (slot-machine wording dropped). Ids stay, so odds tables and their hashes don't change.

alter table public.items
  add column reference text check (char_length(reference) <= 60),
  add column condition text,
  add column authentication text check (char_length(authentication) <= 160);
alter table public.items add constraint items_condition_check
  check (condition in ('new', 'unworn', 'pre-owned-excellent', 'pre-owned-good'));

-- Rows loaded from the first seed (no-op on a fresh database: seed.sql runs after, with the new names).
update public.items set name = replace(name, '+ 2 Free Spins', '+ 2 Bonus Opens') where id ~ '^credit-[0-9]+-fs2$';
update public.items set name = replace(name, '+ Free Spin', '+ Bonus Open') where id ~ '^credit-[0-9]+-fs1$';

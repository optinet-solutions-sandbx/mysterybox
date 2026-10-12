# 08 · Backend: schema, roles and the front-end contract

**Status: initial draft, 2026-10-12.** It's ready for the sync with John (see the last section).
The schema runs and is tested in an in-process Postgres. It has **not** been deployed to a Supabase
project. The UI still runs on the browser mock, so nothing calls Supabase yet.

## What exists

| Path | What it is |
|---|---|
| `supabase/config.toml` | Supabase CLI project (`supabase init`). Sign-up needs email confirmation, the code is 6 digits, and passwords need 8+ characters with letters and digits (the same rules as `/register`). |
| `supabase/templates/confirmation.html` | Sign-up email carrying `{{ .Token }}`, the 6-digit code that the "Check your email" step asks for. |
| `supabase/migrations/20261012120000_core_schema.sql` | Enums and tables: accounts, wallet ledger, catalog and odds, play, fulfilment, audit, settings. |
| `supabase/migrations/20261012120100_auth_roles_rls.sql` | The three roles, the sign-up trigger, row-level security and column grants. |
| `supabase/migrations/20261012120200_wallet_and_play.sql` | Player RPCs: player card, deposit and withdrawal placeholders, `open_box`, sell back, shipping, seeds, `verify_roll`. |
| `supabase/migrations/20261012120300_backoffice.sql` | Back-office views and RPCs (KPIs, daily metrics, players, box performance) and audited staff actions. |
| `supabase/seed.sql` | The catalog, **generated** from `web/src/data` so ids, prices, weights and draw order match the site. |
| `supabase/snippets/bootstrap_super_admin.sql` | Makes the first super admin. |
| `web/src/backend/contract.ts` | The contract in TypeScript: every interaction, its request and response shapes, error codes, and the permission matrix. |
| `web/src/backend/supabase-api.ts` | **Placeholder** adapter implementing the contract with supabase-js. Not wired to the UI and not run against a live project. |
| `web/src/backend/schema.test.ts` | 20 tests that run the migrations and seed in PGlite (Postgres 17) as anon, player, admin and super admin. |
| `web/.env.example` | `NEXT_PUBLIC_BACKEND`, Supabase URL and keys, `SUPABASE_SERVICE_ROLE_KEY` (server only). |

### What the tests prove

- Sign-up creates the profile, role and wallet. User metadata can't grant a role.
- RLS: players see only their own rows. Anon users see only the live catalog. Players can't write the ledger, their role, their status or their wallet, and can't read server seeds.
- Deposits complete instantly in `demo` mode. Withdrawals hold funds until staff settle them. Players can cancel their own pending withdrawals.
- **`open_box` produces exactly the roll and piece that `web/src/domain/fair.ts` computes.** This was checked over 17 openings across three boxes. Sell-back uses the same rate and rounding as `sellBackValue()`.
- `rotate_seeds` reveals the server seed, and `verify_roll` reproduces past openings.
- Admins can read the back office but can't change roles. Super admins can, but can't change their own role or remove the last super admin. Every staff action is audited, and only super admins can read the audit log.
- The KPIs, daily metrics and player overview all add up to the same totals.
- Live odds are frozen. A box only goes live when its weights total the odds scale.

**Not tested:**
- Supabase Auth itself (`signUp`, `verifyOtp`, email delivery). The tests use a small shim of the `auth` schema.
- PostgREST.
- The supabase-js adapter.
- Anything needing Docker (`supabase start`).

## Roles

Every sign-up is a **player**. A super admin promotes staff in the back office (`admin_set_role`).
The first super admin comes from `snippets/bootstrap_super_admin.sql`.

| Permission | Player | Admin | Super admin |
|---|---|---|---|
| Open boxes, deposit and withdraw | ✓ | | |
| See the back office, every player's card and activity | | ✓ | ✓ |
| Suspend and reactivate players | | ✓ | ✓ (staff too) |
| Pay out or cancel withdrawals | | ✓ | ✓ |
| Manage boxes, items and odds (publish, unpublish) | | ✓ | ✓ |
| Add staff and change roles | | | ✓ |
| Adjust a balance, edit settings, read the audit log | | | ✓ |

Staff accounts can't play or move money (`staff_account` error). This keeps staff activity out of
player metrics. It's a proposed rule; see the open questions.

The same matrix is `PERMISSIONS` in `contract.ts`. The SQL functions enforce it server-side, and
the mock back office enforces the same rules in `store/staff-actions.ts`.

## Data model

```
auth.users ─1:1─ profiles ─1:1─ user_roles        (player | admin | super_admin)
                    │  └─1:1─ wallets              balance_cents, held_cents (pending withdrawals)
                    ├─< transactions               signed ledger: deposit, withdrawal, box_open, sell_back, adjustment…
                    ├─< seed_pairs                 provably-fair commitments (server seed secret until rotated)
                    ├─< openings >── boxes ─< box_items >── items
                    ├─< inventory_items ─< shipments
                    └─< audit_log (as actor)       settings (key → jsonb)
```

The rules the front end already follows hold in the database too:
- **Money is `bigint` cents.**
- **Odds are integer weights** out of `boxes.odds_scale` (100,000). The draw walks `box_items` in
  `position` order, so position is part of the fairness contract.
- **Displayed and back-office odds** are both views of the same `box_items.weight` (`box_odds`
  view). There is no separate "display" number.
- Openings snapshot the price, the piece's value and the seed data. History never changes when the
  catalog does.

## Front-end interactions → endpoints

"Mock today" is what the UI calls now. The Supabase column is what replaces it.

| Interaction | Mock today | Contract method | Supabase endpoint | Who |
|---|---|---|---|---|
| Register (email, name, country code + phone, password, 18+/terms, opt-in) | `useAuth.register` | `register` | `POST /auth/v1/signup` with `data:{first_name,…}`; trigger `on_auth_user_created` | anon |
| Enter the 6-digit email code | `useAuth.verify` | `verifyEmailCode` | `POST /auth/v1/verify` (`type: email`) | anon |
| Resend the code | `useAuth.resendCode` | `resendCode` | `POST /auth/v1/resend` (`type: signup`) | anon |
| Sign in / sign out | `useAuth.signIn` / `signOut` | `signIn` / `signOut` | `POST /auth/v1/token?grant_type=password`, then `rpc/touch_last_seen` / `POST /auth/v1/logout` | anon / player |
| **View player card** (`/account`) | `useCurrentUser` + session | `getPlayerCard` | `rpc/get_player_card` | player (own) |
| Update contact details, marketing opt-in | `useAuth.setMarketing` | `updateProfile` | `PATCH /rest/v1/profiles` (column grants: names, phone, opt-in) | player (own) |
| **Deposit** (placeholder) | `useSession.deposit` | `requestDeposit` | `rpc/request_deposit` → completes at once while `payments_mode = demo` | player |
| **Withdraw** (placeholder) | `useSession.requestWithdrawal` | `requestWithdrawal` | `rpc/request_withdrawal` → always `pending`, funds held | player |
| Cancel a pending withdrawal | `useSession.cancelWithdrawal` | `cancelWithdrawal` | `rpc/cancel_withdrawal` | player (own) |
| Wallet activity | `useSession.transactions` | `listTransactions` | `GET /rest/v1/transactions` (RLS: own rows) | player |
| Open a box | `useSession.openBox` | `openBox` | `rpc/open_box` → `{item_id, roll, nonce, client_seed, server_seed_hash, balance_cents}` | player |
| Sell back | `useSession.sellBack` | `sellBack` | `rpc/sell_back` | player |
| Request / cancel shipping | `useSession.requestShipping` / `cancelShipping` | `requestShipping` / `cancelShipping` | `rpc/request_shipping` / `rpc/cancel_shipping` | player |
| Seeds: view, set client seed, rotate | `useSession.seeds…` | `getSeeds` / `setClientSeed` / `rotateSeeds` | `rpc/get_my_seeds` / `rpc/set_client_seed` / `rpc/rotate_seeds` | player |
| Verify a past roll | `computeRoll` in the browser | (public) | `rpc/verify_roll` | anyone |
| Catalog and odds | `services/catalog.ts` (static) | — | `GET /rest/v1/boxes`, `box_items`, `items`, `box_odds` (RLS: live only) | anyone |
| Back office: KPIs | `domain/analytics.kpis` | `kpis` | `rpc/admin_kpis(p_from, p_to)` | admin+ |
| Back office: daily chart | `dailyMetrics` | `dailyMetrics` | `rpc/admin_daily_metrics(p_from, p_to)` | admin+ |
| Back office: players list | `overviewRow` | `listPlayers` | `GET /rest/v1/admin_player_overview` | admin+ |
| Back office: player card + ledger | drawer | `getPlayer` / `listPlayerTransactions` | `rpc/get_player_card(p_user_id)` / `GET /rest/v1/transactions?user_id=eq.…` | admin+ |
| Suspend / reactivate | `staff-actions.setPlayerStatus` | `setPlayerStatus` | `rpc/admin_set_player_status` | admin+ |
| Pay out / cancel a withdrawal | `staff-actions.settleWithdrawal` | `settleTransaction` | `rpc/admin_settle_transaction` (also the payout webhook, service role) | admin+ |
| Box performance (configured vs actual return) | `boxPerformance` | `boxPerformance` | `rpc/admin_box_performance` | admin+ |
| Staff list / change a role | `staff-actions.setRole` | `listStaff` / `setRole` | `GET /rest/v1/admin_staff` / `rpc/admin_set_role` | super admin |
| Add a staff member | `staff-actions.addStaff` | — | **TODO:** Edge Function using `auth.admin.inviteUserByEmail` (service role), then `admin_set_role` | super admin |
| Adjust a balance | — | `adjustBalance` | `rpc/admin_adjust_balance` | super admin |
| Audit log | `useBackoffice.audit` | `listAuditLog` | `GET /rest/v1/audit_log` | super admin |

**Errors.** The SQL functions raise a stable code as the message, and the adapter maps it to
`BackendError.code`. The codes are:
- `insufficient_funds`, `account_not_active`, `staff_account`, `forbidden`;
- `kyc_required`, `amount_below_minimum`, `box_not_available`;
- `odds_do_not_sum`, `cannot_change_self`, `last_super_admin`.

The full list is `BACKEND_ERRORS` in `contract.ts`.

**Back-office definitions** (the same in SQL and in `domain/analytics.ts`):
- *Played* is the box prices paid.
- *Earned* is the listed value of the pieces received.
- *House net* is played minus earned. *Hold* is house net divided by played.
- A player has *played* once they have at least one opening.
- Staff accounts are excluded from all metrics.
- Days are UTC.

## Placeholders still to build

1. **Payments.** `request_deposit` needs to create the processor's checkout and return its
   redirect. The processor's webhook (service role) settles deposits and payouts with
   `admin_settle_transaction`. Set `payments_mode` to `live` once that works.
2. **KYC.** `profiles.kyc_status` and `date_of_birth` exist, and withdrawals check
   `kyc_status = verified` outside demo mode. The provider and its webhook are still to come.
3. **Geo.** `profiles.state` is stored but not enforced. The list of allowed US states is a
   counsel decision.
4. **Shipping.** `shipments.address` is a free-form snapshot. An address book, address
   validation, carrier choice and shipping fees are still to come.
5. **Staff invites.** These need an Edge Function, because creating auth users needs the service
   role.
6. **Pricing and odds.** `boxes.target_rtp` stores the pricing input, but the price is still set
   explicitly. Once the pricing model is final, decide whether a database function derives
   `price_cents` from the weights (`priceForRtp` in `domain/odds.ts`), or whether ops set it and
   `admin_box_performance` reports the configured return. Odds changes require taking the box
   back to draft (audited). If regulators need it, add `box_odds_versions` history before launch.
7. **Responsible play.** Deposit and loss limits, cool-off and self-exclusion. The
   `self_excluded` status exists, but no flow sets it yet.
8. **Wiring the UI.** Switch the stores to call `createSupabaseBackend()` when
   `NEXT_PUBLIC_BACKEND=supabase`. Then move the back-office role check to the server
   (`app/admin` currently opts out of instant-navigation validation because it checks the role in
   the browser).

## Running it

```bash
cd web && npx vitest run src/backend                         # schema, RLS and RPC tests (no Docker)
WRITE_SEED=1 npx vitest run src/backend/catalog-seed.test.ts  # regenerate seed.sql after changing data/
# With Docker running, from the repo root:
npx supabase start            # local stack; Studio at http://127.0.0.1:54323
npx supabase db reset         # applies migrations + seed.sql
npx supabase gen types typescript --local > web/src/backend/database.types.ts
```

## For the sync with John

Please confirm or decide:

1. **Supabase as the backend.** Or will a turnkey platform vendor supply the backend? (The
   research covers both.) If it's a vendor, this schema and contract become the integration spec.
2. **Payment and payout provider.** Do deposits use a redirect or an embedded checkout? What are
   the minimum and maximum amounts? (The placeholders are a $20 minimum withdrawal and a $10,000
   maximum per deposit.)
3. **KYC provider.** When is identity checked: at sign-up, at the first withdrawal, or above a
   threshold?
4. **Staff can't play.** Is that rule right?
5. **Starting balance.** Real accounts start at $0; the demo gives $10,000. Is that right?
6. **Email.** Which SMTP provider sends the 6-digit code, and from which sender address?
7. **Pricing and odds.** Who finalizes the pricing model, and should the database derive prices or
   only validate them?
8. **Reporting.** Is played / earned / house net on listed value the right basis? Or should it
   also report cash, after sell-backs and fulfilment cost?

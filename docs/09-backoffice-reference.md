# 09 · Back-office reference map

**Source:** the team's casino back office (a casino-backend.com platform), player page,
screenshot shared 2026-10-13. The team asked for our back office to copy its structure.
**Personal data in the screenshot is never reproduced.** Only its structure is described here.

We copy the reference's **structure** in our own Grail Noir styling, in both light and dark:
- its menus;
- page anatomy;
- sections, fields and their order.

Casino concepts are renamed to their mystery-box equivalents (Games → Boxes, Tournaments → Battles).

## 1. Global layout

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Brand   Dashboard  Players▾  Games▾  Payments▾  Feed▾  Bonuses▾  Tournaments▾   English▾  user▾ │  top bar
├──────────────────────────────────────────────────────────────────────────────────────┤
│ DASHBOARD / PLAYERS /                                                                  │  page band
│ [icon] Page title                                                                      │
├──────────────────────────────────────────────────────────────────────┬───────────────┤
│ Panel: grey title strip + table                                      │ Side panels   │
│ Panel …                                                              │ …             │
└──────────────────────────────────────────────────────────────────────┴───────────────┘
```

- **Top bar:** module menus, most of them dropdowns. The language and the signed-in staff member
  sit on the right.
- **Page band:** a breadcrumb in small capitals, then an icon and the page title.
- **Panels:** a title strip over a table. Detail pages add a narrow right-hand column of status
  panels.
- **Not visible in the screenshot:** the contents of each dropdown, and the Dashboard, Payments,
  Games, Feed, Bonuses and Tournaments screens. See the open questions.

## 2. The player page (reference URL `/backend/players/:id`)

The title is **full name - masked email** (for example `p******@g****.c**`).

**Main column, top to bottom**

1. **Accounts:** one row per currency account. Columns:
   - ID, Currency, Balance;
   - Deposits sum, Cashouts sum, Pending cashouts sum;
   - Chargebacks sum, Unreceived deposits sum, Refunds sum, Reversals sum;
   - Affiliate payments sum, Deposit reversals sum;
   - Avg bet, Gifts sum, Spent in casino;
   - Casino profit (a red badge when negative, plus a **View** button), Bonuses, Bonus ratio.
2. **Approx average bonus ratio:** a single percentage.
3. **Comp point account:** two rows (Redeemable, Status) with ID, a History link, account type,
   points and micropoints.
4. **Issued bonuses:** a paginated table (10–200 per page, plus an "All bonus issues" link).
   Columns:
   - ID (the bonus name, linked), Issued at, Bonus, Amount;
   - Strategy (free-spins result, manual, scheduler, deposit);
   - Stage (wager done, lost);
   - Amount locked;
   - Wager (`done / required (pct)`);
   - Expiry date.

**Right column**

5. **Status.**
6. **Player locks:** two tables, CS and SB, each with Reason, Comment and Created at. We read CS
   as a lock set by staff or customer support, and SB as the player's self-ban (self-exclusion).
7. **Tags:** coloured chips, for example a high-withdrawal-ratio flag, the player's locale and
   "verified".
8. **Groups:** many `Group: …` chips. They are segments by deposit count, registration date,
   affiliate, country, campaign membership, game provider and payment method.

Anything below the fold isn't visible.

## 3. How Grail Noir maps it

### Menus

| Reference | Grail Noir | State |
|---|---|---|
| Dashboard | `/admin`: KPI band, daily charts, top players, latest openings | Built |
| Players ▾ | `/admin/players`, Groups (`/admin/players/groups`), Locked players, Withdrawal pending | Built |
| Player page | `/admin/players/view?id=<player number>` | Built |
| Games ▾ | **Boxes ▾**: Boxes & odds (with **Configure** and **New box**), **Items** (`/admin/items`), Box openings (`/admin/boxes/openings`) | Built (editing needs Supabase) |
| Payments ▾ | `/admin/payments`: all, deposits, cashouts, pending; mark paid or cancel | Built (provider is a placeholder) |
| Feed ▾ | `/admin/feed`: sign-ups, openings, payments, staff actions | Built |
| Bonuses ▾ | `/admin/bonuses`: issued bonuses, loyalty points | Placeholder (needs the Rewards design) |
| Tournaments ▾ | **Battles ▾** (`/admin/battles`) | Placeholder |
| Language ▾ | — | Not needed yet (English only) |
| User ▾ | Staff & roles, Audit log, **Configuration** (`/admin/settings`; super admin), View site, Sign out | Built (editing needs Supabase) |

### Player page sections

| Reference | Grail Noir | Notes |
|---|---|---|
| Accounts row | Same columns, in USD | Cashouts = paid withdrawals. Pending cashouts = withdrawals awaiting payout. Unreceived deposits = pending deposits. Avg bet → **avg box price**. Gifts = balance adjustments. Spent in casino → **spent on boxes**. Casino profit → **house profit** (spent − listed value of the pieces received); **View** opens the player's box openings. Chargebacks, refunds, reversals, affiliate payments and deposit reversals show 0 until the payment provider and affiliates are connected. |
| Approx average bonus ratio | Same | Bonuses ÷ deposits. 0% until there's a bonus engine. |
| Comp point account | **Loyalty points account** (Redeemable, Status) | Placeholder rule: 1 point per $1 spent on boxes, in micropoints. |
| Issued bonuses | Same columns, empty state | Fills in with the bonus engine. |
| Status | Status, player ID, email, identity check, phone, registered, last seen, marketing | |
| Player locks (CS, SB) | Same two tables, with add and remove | The status follows the locks: SB wins (self-excluded), then CS (suspended), otherwise active. Reason lists are in `player-page.tsx`. |
| Tags | Automatic + manual | Automatic: **HighWDRatio** (cashouts ≥ 80% of deposits), **HighReturn** (10+ openings and received ≥ 120% of spend), **Locale US-XX**, **New** (< 7 days), **verified** (KYC). Staff add and remove their own. |
| Groups | 14 rule-based groups | Reload players (4+ deposits), Min 1 deposit, Deposit in last 7 days, Opened a box in last 7 days, Dormant (30+ days), Registered but never played, 10+ openings, High rollers ($5,000+), Big pull (10× the box), Sells back (5+), Withdrawal pending, Receives marketing, Today's registrations, Registered in last 7 days. Each links to the filtered player list. |
| *(below the fold)* | **Payments**, **Box openings**, **Comments** | Our additions until we see what the reference shows there. |

### Backend

`supabase/migrations/20261013120000_player_management.sql` adds:
- `profiles.player_number` (from 100000);
- the `player_comments`, `player_tags` and `player_locks` tables (staff-only reads; players can see their own locks);
- `admin_lock_player`, `admin_unlock_player`, `admin_add_comment` and `admin_set_tags`;
- the player-side `self_exclude`.

All of these are covered by `schema.test.ts`. Tags and groups are computed in
`web/src/domain/player-insights.ts`. Move them into SQL views once real data flows.

## 4. To confirm with the team

1. **Screenshots still needed:**
   - the open dropdowns;
   - the Dashboard, Payments, Feed, Bonuses and Tournaments screens;
   - the rest of the player page below the fold (likely payments, game history, comments, documents or KYC, sessions).
2. **Lock meanings:** is CS a customer-support lock and SB a self-ban? What are the real reason lists?
3. **Tags and groups:** which ones matter for CRM and risk, and are there thresholds the team already uses (for example the high-withdrawal-ratio flag)?
4. **Should we copy the reference's look too?** We kept the Grail Noir brand. Its grey, dense styling could become a
   "compact" mode.

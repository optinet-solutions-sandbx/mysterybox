import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { computeRoll } from "@/domain/fair";
import { pickByRoll, sellBackValue } from "@/domain/odds";
import { overviewRow } from "@/domain/analytics";
import { catalogFromRows } from "@/services/catalog-source";
import { playersFromRows } from "./remote-admin";
import { as, createTestDb, rpc, signUp, sql } from "./test-db";

/**
 * Runs the real Supabase migrations in PGlite and drives them the way the app will: as anon, as a
 * signed-in player, as admin and as super admin. Parity tests pin the SQL draw to domain/fair.ts.
 */

let db: PGlite;
let alice: string;
let bob: string;
let admin: string;
let owner: string;

const box = (id: string) => boxes.find((b) => b.id === id)!;

async function expectError(promise: Promise<unknown>, message: string | RegExp) {
  await expect(promise).rejects.toThrow(message);
}

beforeAll(async () => {
  db = await createTestDb();
  alice = await signUp(db, "alice@example.com", {
    first_name: "Alice",
    last_name: "Moreau",
    phone_country: "US",
    phone_dial: "+1",
    phone_number: "(212) 555-0147",
    marketing_opt_in: true,
    accepted_terms: true,
    confirmed_age: true,
    role: "super_admin", // user-controlled metadata must never grant a role
  });
  bob = await signUp(db, "bob@example.com", { first_name: "Bob", last_name: "Hale" });
  admin = await signUp(db, "admin@grailnoir.com", { first_name: "Ada", last_name: "Admin" });
  owner = await signUp(db, "owner@grailnoir.com", { first_name: "Olivia", last_name: "Owner" });
  // Bootstrap (SQL editor / service role): the first super admin and one admin.
  await sql(db, "update public.user_roles set role = 'admin' where user_id = $1", [admin]);
  await sql(db, "update public.user_roles set role = 'super_admin' where user_id = $1", [owner]);
}, 60_000);

describe("migrations and seed", () => {
  it("load the full catalog with every box live", async () => {
    const [{ n }] = await sql<{ n: number }>(db, "select count(*)::int as n from public.items");
    expect(n).toBe(items.length);
    const live = await sql<{ id: string; price_cents: string }>(db, "select id, price_cents from public.boxes where status = 'live' order by sort_order");
    expect(live.map((b) => b.id)).toEqual(boxes.map((b) => b.id));
    expect(live.map((b) => Number(b.price_cents))).toEqual(boxes.map((b) => b.price));
  });

  it("publish the same odds the site shows (box_odds view)", async () => {
    const rows = await as(db, null, () =>
      sql<{ item_id: string; weight: number; roll_from: number; roll_to: number }>(
        db,
        "select item_id, weight, roll_from, roll_to from public.box_odds where box_id = 'time-room' order by position",
      ),
    );
    expect(rows.map((r) => [r.item_id, r.weight])).toEqual(box("time-room").entries.map((e) => [e.itemId, e.weight]));
    expect(rows[0].roll_from).toBe(0);
    expect(rows.at(-1)!.roll_to).toBe(99_999);
  });
});

describe("sign-up", () => {
  it("creates a player profile, role and empty wallet from the registration fields", async () => {
    const card = await as(db, alice, () => rpc<Record<string, unknown>>(db, "get_player_card"));
    expect(card).toMatchObject({
      email: "alice@example.com",
      first_name: "Alice",
      last_name: "Moreau",
      phone: { country: "US", dial: "+1", number: "2125550147" },
      role: "player",
      status: "active",
      marketing_opt_in: true,
      wallet: { balance_cents: 0, held_cents: 0, currency: "USD" },
    });
    const [profile] = await sql<{ terms: boolean; age: boolean }>(
      db,
      "select terms_accepted_at is not null as terms, age_confirmed_at is not null as age from public.profiles where id = $1",
      [alice],
    );
    expect(profile).toEqual({ terms: true, age: true });
  });
});

describe("row-level security", () => {
  it("shows players only their own rows and anon only the live catalog", async () => {
    await sql(db, "insert into public.boxes (id, slug, name, price_cents) values ('secret-draft', 'secret-draft', 'Draft', 100)");
    const anonBoxes = await as(db, null, () => sql<{ id: string }>(db, "select id from public.boxes"));
    expect(anonBoxes.map((b) => b.id)).not.toContain("secret-draft");
    expect(await as(db, null, () => sql(db, "select * from public.profiles"))).toHaveLength(0);

    const seen = await as(db, alice, () => sql<{ id: string }>(db, "select id from public.profiles"));
    expect(seen.map((p) => p.id)).toEqual([alice]);
    await expectError(as(db, alice, () => rpc(db, "get_player_card", [bob])), "forbidden");
  });

  it("never lets a player write the ledger, their role, their status or read server seeds", async () => {
    await expectError(
      as(db, alice, () => sql(db, "insert into public.transactions (user_id, type, amount_cents) values ($1, 'deposit', 100000)", [alice])),
      /permission denied/,
    );
    await expectError(as(db, alice, () => sql(db, "update public.user_roles set role = 'super_admin'")), /permission denied/);
    await expectError(as(db, alice, () => sql(db, "update public.profiles set status = 'active' where id = $1", [alice])), /permission denied/);
    await expectError(as(db, alice, () => sql(db, "update public.wallets set balance_cents = 99999999")), /permission denied/);
    await expectError(as(db, alice, () => sql(db, "select server_seed from public.seed_pairs")), /permission denied/);
    await expectError(as(db, alice, () => sql(db, "select public._settle(gen_random_uuid(), 'completed', null)")), /permission denied/);

    await as(db, alice, () => sql(db, "update public.profiles set first_name = 'Alicia' where id = $1", [alice]));
    const [{ first_name }] = await sql<{ first_name: string }>(db, "select first_name from public.profiles where id = $1", [alice]);
    expect(first_name).toBe("Alicia");
  });
});

describe("wallet placeholders", () => {
  it("completes deposits at once in demo mode", async () => {
    const res = await as(db, alice, () => rpc(db, "request_deposit", [1_000_000]));
    expect(res).toMatchObject({ status: "completed", balance_cents: 1_000_000 });
    await expectError(as(db, alice, () => rpc(db, "request_deposit", [1_000_001])), "amount_above_limit");
    await expectError(as(db, alice, () => rpc(db, "request_deposit", [0])), "invalid_amount");
  });

  it("holds withdrawals until staff settle them, and lets the player cancel", async () => {
    const w1 = await as(db, alice, () => rpc<{ transaction_id: string; balance_cents: number }>(db, "request_withdrawal", [50_000]));
    expect(w1.balance_cents).toBe(950_000);
    await expectError(as(db, alice, () => rpc(db, "admin_settle_transaction", [w1.transaction_id, "completed"])), "forbidden");
    await as(db, admin, () => rpc(db, "admin_settle_transaction", [w1.transaction_id, "completed"]));

    const w2 = await as(db, alice, () => rpc<{ transaction_id: string }>(db, "request_withdrawal", [10_000]));
    const cancelled = await as(db, alice, () => rpc(db, "cancel_withdrawal", [w2.transaction_id]));
    expect(cancelled).toMatchObject({ status: "cancelled", balance_cents: 950_000 });

    const [wallet] = await sql<{ balance_cents: string; held_cents: string }>(db, "select balance_cents, held_cents from public.wallets where user_id = $1", [alice]);
    expect([Number(wallet.balance_cents), Number(wallet.held_cents)]).toEqual([950_000, 0]);
    await expectError(as(db, alice, () => rpc(db, "request_withdrawal", [1_000])), "amount_below_minimum");
    await expectError(as(db, bob, () => rpc(db, "request_withdrawal", [5_000])), "insufficient_funds");
  });

  it("keeps staff accounts out of play and payments", async () => {
    await expectError(as(db, admin, () => rpc(db, "request_deposit", [1_000])), "staff_account");
    await expectError(as(db, admin, () => rpc(db, "open_box", ["first-edition"])), "staff_account");
  });
});

describe("open_box", () => {
  it("rejects unknown boxes and empty wallets", async () => {
    await expectError(as(db, bob, () => rpc(db, "open_box", ["first-edition"])), "insufficient_funds");
    await expectError(as(db, alice, () => rpc(db, "open_box", ["secret-draft"])), "box_not_available");
  });

  it("draws exactly what the front end's provably-fair code computes", async () => {
    for (let i = 0; i < 2; i++) await as(db, alice, () => rpc(db, "request_deposit", [1_000_000]));
    for (const [boxId, times] of [["first-edition", 12], ["time-room", 3], ["atelier", 2]] as const) {
      for (let i = 0; i < times; i++) {
        const before = await as(db, alice, () => rpc<{ wallet: { balance_cents: number } }>(db, "get_player_card"));
        const res = await as(db, alice, () =>
          rpc<{ item_id: string; roll: number; nonce: number; client_seed: string; server_seed_hash: string; balance_cents: number }>(db, "open_box", [boxId]),
        );
        const [{ server_seed }] = await sql<{ server_seed: string }>(db, "select server_seed from public.seed_pairs where user_id = $1 and active", [alice]);
        const roll = await computeRoll(server_seed, res.client_seed, res.nonce);
        expect(res.roll).toBe(roll);
        expect(res.item_id).toBe(pickByRoll(box(boxId).entries, roll).itemId);
        expect(res.balance_cents).toBe(before.wallet.balance_cents - box(boxId).price);
      }
    }
    const [{ n, nonce }] = await sql<{ n: number; nonce: number }>(
      db,
      "select (select count(*)::int from public.openings where user_id = $1) as n, (select nonce from public.seed_pairs where user_id = $1 and active) as nonce",
      [alice],
    );
    expect([n, nonce]).toEqual([17, 17]);
  });

  it("writes one ledger row per opening with the balance after it", async () => {
    const rows = await as(db, alice, () =>
      sql<{ amount_cents: string; balance_after_cents: string }>(
        db,
        "select amount_cents, balance_after_cents from public.transactions where type = 'box_open' order by created_at, balance_after_cents desc",
      ),
    );
    expect(rows).toHaveLength(17);
    const [{ balance_cents }] = await sql<{ balance_cents: string }>(db, "select balance_cents from public.wallets where user_id = $1", [alice]);
    expect(Math.min(...rows.map((r) => Number(r.balance_after_cents)))).toBe(Number(balance_cents));
  });
});

describe("inventory", () => {
  it("sells back at the same rate and rounding as sellBackValue()", async () => {
    const held = await as(db, alice, () =>
      sql<{ id: string; value: string }>(
        db,
        "select inv.id, i.value_cents as value from public.inventory_items inv join public.items i on i.id = inv.item_id where inv.status = 'held' order by inv.acquired_at limit 3",
      ),
    );
    const expected = held.reduce((sum, h) => sum + sellBackValue(Number(h.value)), 0);
    const res = await as(db, alice, () => rpc<{ credited_cents: number; sold: number }>(db, "sell_back", [held.map((h) => h.id)]));
    expect(res).toMatchObject({ credited_cents: expected, sold: 3 });
    await expectError(as(db, alice, () => rpc(db, "sell_back", [held.map((h) => h.id)])), "nothing_to_sell");
    await expectError(as(db, bob, () => rpc(db, "sell_back", [[held[0].id]])), "nothing_to_sell");
  });

  it("ships pieces but not credits, and cancels only while requested", async () => {
    const [piece] = await sql<{ id: string }>(
      db,
      "select inv.id from public.inventory_items inv join public.items i on i.id = inv.item_id where inv.user_id = $1 and inv.status = 'held' and i.category <> 'credit' limit 1",
      [alice],
    );
    const [credit] = await sql<{ id: string }>(
      db,
      "select inv.id from public.inventory_items inv join public.items i on i.id = inv.item_id where inv.user_id = $1 and inv.status = 'held' and i.category = 'credit' limit 1",
      [alice],
    );
    if (credit) await expectError(as(db, alice, () => rpc(db, "request_shipping", [credit.id, "{}"])), "not_shippable");
    expect(piece, "the parity run should have produced at least one shippable piece").toBeDefined();
    await as(db, alice, () => rpc(db, "request_shipping", [piece.id, JSON.stringify({ line1: "1 Main St", state: "NY" })]));
    await as(db, alice, () => rpc(db, "cancel_shipping", [piece.id]));
    const [{ status }] = await sql<{ status: string }>(db, "select status from public.inventory_items where id = $1", [piece.id]);
    expect(status).toBe("held");
  });
});

describe("seeds", () => {
  it("reveals the server seed on rotation, and verify_roll reproduces past openings", async () => {
    const [first] = await sql<{ item_id: string; roll: number; nonce: number; client_seed: string; box_id: string }>(
      db,
      "select item_id, roll, nonce, client_seed, box_id from public.openings where user_id = $1 order by nonce limit 1",
      [alice],
    );
    const seeds = await as(db, alice, () => rpc<{ revealed: { server_seed: string }[]; active: { nonce: number } }>(db, "rotate_seeds"));
    expect(seeds.active.nonce).toBe(0);
    const verified = await as(db, null, () =>
      rpc<{ roll: number; item_id: string }>(db, "verify_roll", [seeds.revealed[0].server_seed, first.client_seed, first.nonce, first.box_id]),
    );
    expect(verified).toMatchObject({ roll: first.roll, item_id: first.item_id });
  });
});

describe("back office", () => {
  it("gives admins every player, and players nothing", async () => {
    const rows = await as(db, admin, () => sql<{ email: string }>(db, "select email from public.admin_player_overview order by email"));
    expect(rows.map((r) => r.email)).toEqual(["alice@example.com", "bob@example.com"]);
    expect(await as(db, alice, () => sql(db, "select * from public.admin_player_overview"))).toHaveLength(0);
    await expectError(as(db, alice, () => rpc(db, "admin_kpis", ["2020-01-01", "2100-01-01"])), "forbidden");
  });

  it("adds up: KPIs, daily metrics and the player overview agree with the openings", async () => {
    const [truth] = await sql<{ n: number; played: string; earned: string }>(
      db,
      "select count(*)::int as n, sum(price_cents) as played, sum(item_value_cents) as earned from public.openings",
    );
    const today = new Date().toISOString().slice(0, 10);
    const kpis = await as(db, admin, () =>
      rpc<Record<string, number>>(db, "admin_kpis", [today, today]),
    );
    expect(kpis).toMatchObject({
      registered_total: 2,
      players_played_ever: 1,
      players_played_in_range: 1,
      openings: truth.n,
      played_cents: Number(truth.played),
      earned_cents: Number(truth.earned),
      house_net_cents: Number(truth.played) - Number(truth.earned),
      deposits_cents: 3_000_000,
      withdrawals_cents: 50_000,
    });
    const daily = await as(db, admin, () =>
      sql<{ registrations: number; first_time_players: number; openings: number; played_cents: string }>(
        db,
        "select * from public.admin_daily_metrics($1, $1)",
        [today],
      ),
    );
    expect(daily[0]).toMatchObject({ registrations: 2, first_time_players: 1, openings: truth.n });
    expect(Number(daily[0].played_cents)).toBe(Number(truth.played));

    const [aliceRow] = await as(db, admin, () =>
      sql<{ openings: number; played_cents: string; house_net_cents: string }>(db, "select * from public.admin_player_overview where id = $1", [alice]),
    );
    expect(aliceRow.openings).toBe(truth.n);
    expect(Number(aliceRow.house_net_cents)).toBe(Number(truth.played) - Number(truth.earned));
  });

  it("lets admins suspend players (who then can't play) but only super admins change roles", async () => {
    await as(db, admin, () => rpc(db, "admin_set_player_status", [bob, "suspended", "chargeback review"]));
    await expectError(as(db, bob, () => rpc(db, "request_deposit", [1_000])), "account_not_active");
    await expectError(as(db, admin, () => rpc(db, "admin_set_role", [bob, "admin"])), "forbidden");
    await expectError(as(db, admin, () => rpc(db, "admin_set_player_status", [owner, "suspended"])), "forbidden");

    await as(db, owner, () => rpc(db, "admin_set_role", [bob, "admin"]));
    await as(db, owner, () => rpc(db, "admin_set_role", [bob, "player"]));
    await expectError(as(db, owner, () => rpc(db, "admin_set_role", [owner, "admin"])), "cannot_change_self");
  });

  it("keeps the last super admin and audits every staff action for super admins only", async () => {
    const second = await signUp(db, "second@grailnoir.com", {});
    await sql(db, "update public.user_roles set role = 'super_admin' where user_id = $1", [second]);
    await as(db, owner, () => rpc(db, "admin_set_role", [second, "admin"]));
    await expectError(as(db, second, () => rpc(db, "admin_set_role", [owner, "player"])), "forbidden");

    const log = await as(db, owner, () => sql<{ action: string }>(db, "select action from public.audit_log order by id"));
    expect(log.map((l) => l.action)).toEqual([
      "transaction.settle",
      "player.status",
      "role.change",
      "role.change",
      "role.change",
    ]);
    expect(await as(db, admin, () => sql(db, "select * from public.audit_log"))).toHaveLength(0);
  });
});

describe("odds integrity", () => {
  it("freezes the odds of a live box and only publishes weights that sum to the scale", async () => {
    await expectError(
      as(db, admin, () => sql(db, "update public.box_items set weight = weight + 1 where box_id = 'first-edition' and position = 0")),
      "odds_frozen",
    );
    await sql(db, "insert into public.box_items (box_id, item_id, position, weight) values ('secret-draft', 'credit-2', 0, 99999)");
    await expectError(as(db, admin, () => rpc(db, "admin_set_box_status", ["secret-draft", "live"])), "odds_do_not_sum");
    await sql(db, "update public.box_items set weight = 100000 where box_id = 'secret-draft'");
    await as(db, admin, () => rpc(db, "admin_set_box_status", ["secret-draft", "live"]));
    const [{ status }] = await sql<{ status: string }>(db, "select status from public.boxes where id = 'secret-draft'");
    expect(status).toBe("live");
  });
});

describe("player management", () => {
  const statusOf = async (id: string) => (await sql<{ status: string }>(db, "select status from public.profiles where id = $1", [id]))[0].status;

  it("gives every player a unique number from 100000 up, shown in the overview", async () => {
    const rows = await sql<{ player_number: string }>(db, "select player_number from public.profiles");
    expect(rows.every((r) => Number(r.player_number) >= 100_000)).toBe(true);
    expect(new Set(rows.map((r) => r.player_number)).size).toBe(rows.length);
    const [row] = await as(db, admin, () => sql<{ player_number: string }>(db, "select player_number from public.admin_player_overview where id = $1", [alice]));
    expect(Number(row.player_number)).toBeGreaterThanOrEqual(100_000);
  });

  it("derives the status from locks: self-exclusion wins over a CS lock", async () => {
    const cs = await as(db, admin, () => rpc<string>(db, "admin_lock_player", [alice, "cs", "Chargeback review", "card issuer dispute"]));
    expect(await statusOf(alice)).toBe("suspended");
    const sb = await as(db, admin, () => rpc<string>(db, "admin_lock_player", [alice, "sb", "Player request: 6 months", ""]));
    expect(await statusOf(alice)).toBe("self_excluded");
    await as(db, admin, () => rpc(db, "admin_unlock_player", [sb]));
    expect(await statusOf(alice)).toBe("suspended");
    await as(db, admin, () => rpc(db, "admin_unlock_player", [cs]));
    expect(await statusOf(alice)).toBe("active");

    expect(await as(db, alice, () => sql(db, "select * from public.player_locks"))).toHaveLength(2);
    expect(await as(db, bob, () => sql(db, "select * from public.player_locks"))).toHaveLength(0);
    await expectError(as(db, admin, () => rpc(db, "admin_lock_player", [owner, "cs", "Other", ""])), "forbidden");
    await expectError(as(db, alice, () => rpc(db, "admin_lock_player", [bob, "cs", "Other", ""])), "forbidden");
    await expectError(as(db, admin, () => rpc(db, "admin_unlock_player", [cs])), "lock_not_found");
  });

  it("keeps staff comments and tags out of players' reach", async () => {
    await as(db, admin, () => rpc(db, "admin_add_comment", [alice, "Called about the pending cashout."]));
    await as(db, admin, () => rpc(db, "admin_set_tags", [alice, ["VIP", "HighWDRatio"]]));
    await as(db, admin, () => rpc(db, "admin_set_tags", [alice, ["VIP"]]));
    const tags = await as(db, admin, () => sql<{ tag: string }>(db, "select tag from public.player_tags where player_id = $1", [alice]));
    expect(tags.map((t) => t.tag)).toEqual(["VIP"]);
    expect(await as(db, alice, () => sql(db, "select * from public.player_comments"))).toHaveLength(0);
    expect(await as(db, alice, () => sql(db, "select * from public.player_tags"))).toHaveLength(0);
    await expectError(as(db, alice, () => rpc(db, "admin_add_comment", [alice, "hi"])), "forbidden");
    await expectError(as(db, admin, () => rpc(db, "admin_set_tags", [alice, ["bad tag!"]])), /check constraint/);
  });

  it("lets a player self-exclude, which stops play until staff lift it", async () => {
    const carol = await signUp(db, "carol@example.com", { first_name: "Carol" });
    await as(db, carol, () => rpc(db, "self_exclude", ["Taking a break"]));
    expect(await statusOf(carol)).toBe("self_excluded");
    await expectError(as(db, carol, () => rpc(db, "request_deposit", [1_000])), "account_not_active");
  });
});

describe("front-end mappers read the real rows", () => {
  it("rebuild the catalog from the database exactly as the site defines it", async () => {
    const [items, boxRows, odds] = await Promise.all([
      as(db, null, () => sql<Record<string, unknown>>(db, "select id, name, brand, category, value_cents, image_url, active from public.items")),
      as(db, null, () => sql<Record<string, unknown>>(db, "select * from public.boxes where status = 'live' and id <> 'secret-draft' order by sort_order")),
      as(db, null, () => sql<Record<string, unknown>>(db, "select box_id, item_id, position, weight from public.box_items order by box_id, position")),
    ]);
    const data = catalogFromRows(items, boxRows, odds);
    expect(data.boxes.map((b) => [b.id, b.price, b.entries])).toEqual(boxes.map((b) => [b.id, b.price, b.entries]));
    expect(new Map(data.items.map((i) => [i.id, i.value]))).toEqual(new Map(items.map((i) => [String(i.id), Number(i.value_cents)])));
  });

  it("turn the back-office rows into the same numbers the SQL reports", async () => {
    const [overview, openings, transactions, wallets] = await as(db, admin, () =>
      Promise.all([
        sql<Record<string, unknown>>(db, "select * from public.admin_player_overview"),
        sql<Record<string, unknown>>(db, "select user_id, box_id, item_id, price_cents, item_value_cents, created_at from public.openings"),
        sql<Record<string, unknown>>(db, "select id, user_id, type, status, amount_cents, created_at from public.transactions"),
        sql<Record<string, unknown>>(db, "select user_id, held_cents from public.wallets"),
      ]),
    );
    const players = playersFromRows(
      overview.map((r) => ({ ...r, registered_at: new Date(String(r.registered_at)).toISOString() })),
      openings.map((r) => ({ ...r, created_at: new Date(String(r.created_at)).toISOString() })),
      transactions.map((r) => ({ ...r, created_at: new Date(String(r.created_at)).toISOString() })),
      wallets,
    );
    const a = players.find((p) => p.id === alice)!;
    const row = overview.find((r) => r.id === alice)!;
    const mine = overviewRow(a);
    expect(mine.openings).toBe(Number(row.openings));
    expect(mine.playedCents).toBe(Number(row.played_cents));
    expect(mine.earnedCents).toBe(Number(row.earned_cents));
    expect(mine.depositsCents).toBe(Number(row.deposits_cents));
    expect(mine.withdrawalsCents).toBe(Number(row.withdrawals_cents));
    expect(a.number).toBe(Number(row.player_number));
  });
});

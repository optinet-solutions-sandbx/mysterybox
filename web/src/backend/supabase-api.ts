import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  BackendError,
  toErrorCode,
  type AppRole,
  type AuditEntry,
  type BackOfficeApi,
  type BoxPerformanceRow,
  type DailyMetric,
  type Kpis,
  type LedgerEntry,
  type PaymentResult,
  type PlayerApi,
  type PlayerCard,
  type PlayerOverviewRow,
  type SeedsView,
  type StaffMember,
} from "./contract";

/**
 * PLACEHOLDER (not wired to the UI yet, not run against a live project): the contract over
 * Supabase Auth + PostgREST + the RPCs in supabase/migrations. Each method names its endpoint.
 * Once the project exists, generate types (`supabase gen types typescript`) and pass them to
 * createClient<Database>() so the RPC names and arguments are checked.
 */

type Row = Record<string, unknown>;

const n = (v: unknown) => Number(v ?? 0);
const s = (v: unknown) => (v == null ? null : String(v));

function fail(error: { message?: string; code?: string } | null): never {
  const code = error?.code === "invalid_credentials" ? "invalid_credentials"
    : error?.code === "email_not_confirmed" ? "email_not_verified"
    : error?.code === "otp_expired" ? "invalid_code"
    : error?.code === "user_already_exists" || error?.code === "email_exists" ? "email_taken"
    : toErrorCode(error?.message);
  throw new BackendError(code, error?.message);
}

function card(r: Row): PlayerCard {
  const phone = (r.phone ?? {}) as Row;
  const wallet = (r.wallet ?? {}) as Row;
  const st = (r.stats ?? {}) as Row;
  return {
    id: String(r.id),
    email: String(r.email),
    firstName: String(r.first_name ?? ""),
    lastName: String(r.last_name ?? ""),
    phone: { country: s(phone.country), dial: s(phone.dial), number: s(phone.number) },
    state: s(r.state),
    role: r.role as PlayerCard["role"],
    status: r.status as PlayerCard["status"],
    kycStatus: r.kyc_status as PlayerCard["kycStatus"],
    marketingOptIn: Boolean(r.marketing_opt_in),
    registeredAt: String(r.registered_at),
    lastSeenAt: s(r.last_seen_at),
    wallet: { balanceCents: n(wallet.balance_cents), heldCents: n(wallet.held_cents), currency: String(wallet.currency ?? "USD") },
    stats: {
      openings: n(st.openings),
      playedCents: n(st.played_cents),
      earnedCents: n(st.earned_cents),
      houseNetCents: n(st.house_net_cents),
      firstPlayedAt: s(st.first_played_at),
      lastPlayedAt: s(st.last_played_at),
      soldBackCents: n(st.sold_back_cents),
      depositsCents: n(st.deposits_cents),
      withdrawalsCents: n(st.withdrawals_cents),
      piecesHeld: n(st.pieces_held),
    },
  };
}

const payment = (r: Row): PaymentResult => ({
  transactionId: String(r.transaction_id),
  status: r.status as PaymentResult["status"],
  balanceCents: n(r.balance_cents),
});

const ledger = (r: Row): LedgerEntry => ({
  id: String(r.id),
  type: r.type as LedgerEntry["type"],
  status: r.status as LedgerEntry["status"],
  amountCents: n(r.amount_cents),
  balanceAfterCents: r.balance_after_cents == null ? null : n(r.balance_after_cents),
  note: s(r.note),
  createdAt: String(r.created_at),
});

function seeds(r: Row): SeedsView {
  const active = r.active as Row;
  return {
    active: { serverSeedHash: String(active.server_seed_hash), clientSeed: String(active.client_seed), nonce: n(active.nonce) },
    revealed: ((r.revealed ?? []) as Row[]).map((x) => ({
      serverSeed: String(x.server_seed),
      serverSeedHash: String(x.server_seed_hash),
      clientSeed: String(x.client_seed),
      nonce: n(x.nonce),
      revealedAt: String(x.revealed_at),
    })),
  };
}

export function createSupabaseBackend(supabase: SupabaseClient): PlayerApi & BackOfficeApi {
  async function call<T>(fn: string, args: Row, map: (r: Row) => T): Promise<T> {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) fail(error);
    return map(data as Row);
  }

  async function myCard() {
    return call("get_player_card", {}, card);
  }

  return {
    // POST /auth/v1/signup — the trigger on_auth_user_created builds profile, role and wallet.
    async register(input) {
      const { error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            first_name: input.firstName,
            last_name: input.lastName,
            phone_country: input.phoneCountry,
            phone_dial: input.phoneDial,
            phone_number: input.phoneNumber,
            marketing_opt_in: input.marketingOptIn,
            accepted_terms: input.acceptedTerms,
            confirmed_age: input.confirmedAge,
          },
        },
      });
      if (error) fail(error);
      return { email: input.email };
    },
    // POST /auth/v1/verify — the 6-digit code from the confirmation email.
    async verifyEmailCode(email, code) {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) fail(error);
      return myCard();
    },
    // POST /auth/v1/resend
    async resendCode(email) {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) fail(error);
    },
    // POST /auth/v1/token?grant_type=password
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) fail(error);
      void supabase.rpc("touch_last_seen");
      return myCard();
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) fail(error);
    },
    // POST /rest/v1/rpc/get_player_card
    getPlayerCard: myCard,
    // PATCH /rest/v1/profiles?id=eq.<uid> (column grants allow contact details only)
    async updateProfile(patch) {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new BackendError("not_authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({
          ...(patch.firstName !== undefined && { first_name: patch.firstName }),
          ...(patch.lastName !== undefined && { last_name: patch.lastName }),
          ...(patch.phoneCountry !== undefined && { phone_country: patch.phoneCountry }),
          ...(patch.phoneDial !== undefined && { phone_dial: patch.phoneDial }),
          ...(patch.phoneNumber !== undefined && { phone_number: patch.phoneNumber }),
          ...(patch.marketingOptIn !== undefined && { marketing_opt_in: patch.marketingOptIn }),
        })
        .eq("id", auth.user.id);
      if (error) fail(error);
    },
    // POST /rest/v1/rpc/request_deposit (placeholder: completes at once while payments_mode = 'demo')
    requestDeposit: (amountCents) => call("request_deposit", { p_amount_cents: amountCents }, payment),
    // POST /rest/v1/rpc/request_withdrawal (always pending until settled)
    requestWithdrawal: (amountCents) => call("request_withdrawal", { p_amount_cents: amountCents }, payment),
    cancelWithdrawal: (transactionId) => call("cancel_withdrawal", { p_transaction_id: transactionId }, payment),
    // GET /rest/v1/transactions?order=created_at.desc&limit=…
    async listTransactions(limit = 50) {
      const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) fail(error);
      return (data as Row[]).map(ledger);
    },
    // POST /rest/v1/rpc/open_box
    openBox: (boxId) =>
      call("open_box", { p_box_id: boxId }, (r) => ({
        openingId: String(r.opening_id),
        inventoryItemId: String(r.inventory_item_id),
        itemId: String(r.item_id),
        itemValueCents: n(r.item_value_cents),
        roll: n(r.roll),
        nonce: n(r.nonce),
        clientSeed: String(r.client_seed),
        serverSeedHash: String(r.server_seed_hash),
        balanceCents: n(r.balance_cents),
      })),
    sellBack: (ids) =>
      call("sell_back", { p_inventory_ids: ids }, (r) => ({ creditedCents: n(r.credited_cents), sold: n(r.sold), balanceCents: n(r.balance_cents) })),
    requestShipping: (id, address) =>
      call("request_shipping", { p_inventory_id: id, p_address: address }, (r) => ({ shipmentId: String(r.shipment_id) })),
    cancelShipping: (id) => call("cancel_shipping", { p_inventory_id: id }, () => undefined),
    getSeeds: () => call("get_my_seeds", {}, seeds),
    setClientSeed: (clientSeed) => call("set_client_seed", { p_client_seed: clientSeed }, seeds),
    rotateSeeds: () => call("rotate_seeds", {}, seeds),

    // Back office ------------------------------------------------------------------------------
    kpis: (range) =>
      call("admin_kpis", { p_from: range.from, p_to: range.to }, (r): Kpis => ({
        registeredTotal: n(r.registered_total),
        registeredInRange: n(r.registered_in_range),
        playersPlayedEver: n(r.players_played_ever),
        playersPlayedInRange: n(r.players_played_in_range),
        openings: n(r.openings),
        playedCents: n(r.played_cents),
        earnedCents: n(r.earned_cents),
        houseNetCents: n(r.house_net_cents),
        depositsCents: n(r.deposits_cents),
        withdrawalsCents: n(r.withdrawals_cents),
        soldBackCents: n(r.sold_back_cents),
        pendingWithdrawals: n(r.pending_withdrawals),
      })),
    async dailyMetrics(range) {
      const { data, error } = await supabase.rpc("admin_daily_metrics", { p_from: range.from, p_to: range.to });
      if (error) fail(error);
      return (data as Row[]).map(
        (r): DailyMetric => ({
          day: String(r.day),
          registrations: n(r.registrations),
          playersPlayed: n(r.players_played),
          firstTimePlayers: n(r.first_time_players),
          openings: n(r.openings),
          playedCents: n(r.played_cents),
          earnedCents: n(r.earned_cents),
          depositsCents: n(r.deposits_cents),
          withdrawalsCents: n(r.withdrawals_cents),
        }),
      );
    },
    // GET /rest/v1/admin_player_overview
    async listPlayers() {
      const { data, error } = await supabase.from("admin_player_overview").select("*").order("registered_at", { ascending: false });
      if (error) fail(error);
      return (data as Row[]).map(
        (r): PlayerOverviewRow => ({
          id: String(r.id),
          email: String(r.email),
          firstName: String(r.first_name ?? ""),
          lastName: String(r.last_name ?? ""),
          phoneDial: s(r.phone_dial),
          phoneNumber: s(r.phone_number),
          state: s(r.state),
          status: r.status as PlayerOverviewRow["status"],
          kycStatus: r.kyc_status as PlayerOverviewRow["kycStatus"],
          marketingOptIn: Boolean(r.marketing_opt_in),
          registeredAt: String(r.registered_at),
          lastSeenAt: s(r.last_seen_at),
          openings: n(r.openings),
          playedCents: n(r.played_cents),
          earnedCents: n(r.earned_cents),
          houseNetCents: n(r.house_net_cents),
          firstPlayedAt: s(r.first_played_at),
          lastPlayedAt: s(r.last_played_at),
          soldBackCents: n(r.sold_back_cents),
          depositsCents: n(r.deposits_cents),
          withdrawalsCents: n(r.withdrawals_cents),
          balanceCents: n(r.balance_cents),
        }),
      );
    },
    getPlayer: (playerId) => call("get_player_card", { p_user_id: playerId }, card),
    async listPlayerTransactions(playerId, limit = 50) {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", playerId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) fail(error);
      return (data as Row[]).map(ledger);
    },
    setPlayerStatus: (playerId, status, reason) =>
      call("admin_set_player_status", { p_user_id: playerId, p_status: status, p_reason: reason ?? null }, () => undefined),
    async boxPerformance(range) {
      const { data, error } = await supabase.rpc("admin_box_performance", { p_from: range.from, p_to: range.to });
      if (error) fail(error);
      return (data as Row[]).map(
        (r): BoxPerformanceRow => ({
          boxId: String(r.box_id),
          name: String(r.name),
          status: r.status as BoxPerformanceRow["status"],
          priceCents: n(r.price_cents),
          expectedRtp: n(r.expected_rtp),
          openings: n(r.openings),
          playedCents: n(r.played_cents),
          earnedCents: n(r.earned_cents),
          actualRtp: r.actual_rtp == null ? null : n(r.actual_rtp),
        }),
      );
    },
    settleTransaction: (transactionId, outcome) =>
      call("admin_settle_transaction", { p_transaction_id: transactionId, p_outcome: outcome }, payment),
    async listStaff() {
      const { data, error } = await supabase.from("admin_staff").select("*").order("granted_at");
      if (error) fail(error);
      return (data as Row[]).map(
        (r): StaffMember => ({
          id: String(r.id),
          email: String(r.email),
          firstName: String(r.first_name ?? ""),
          lastName: String(r.last_name ?? ""),
          role: r.role as StaffMember["role"],
          grantedAt: String(r.granted_at),
          status: r.status as StaffMember["status"],
          lastSeenAt: s(r.last_seen_at),
        }),
      );
    },
    setRole: (userId, role: AppRole) => call("admin_set_role", { p_user_id: userId, p_role: role }, () => undefined),
    adjustBalance: (playerId, amountCents, note) =>
      call("admin_adjust_balance", { p_user_id: playerId, p_amount_cents: amountCents, p_note: note }, (r) => ({ balanceCents: n(r.balance_cents) })),
    async listAuditLog(limit = 100) {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) fail(error);
      return (data as Row[]).map(
        (r): AuditEntry => ({
          id: String(r.id),
          actorId: s(r.actor_id),
          actorRole: (r.actor_role ?? null) as AppRole | null,
          action: String(r.action),
          targetType: s(r.target_type),
          targetId: s(r.target_id),
          detail: (r.detail ?? {}) as Record<string, unknown>,
          createdAt: String(r.created_at),
        }),
      );
    },
  };
}

/** Browser client from the public env vars (see web/.env.example). Throws until they are set. */
export function createBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new BackendError("not_configured", "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return createClient(url, key);
}

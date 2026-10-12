import type { Cents } from "@/domain/types";

/**
 * The backend contract: every interaction the front end needs, with request/response shapes.
 * Two implementations follow it:
 *   - today's mock (store/auth.ts, store/session.ts, data/demo-players.ts), in the browser;
 *   - backend/supabase-api.ts, a placeholder over the schema in supabase/migrations.
 * docs/08-backend.md maps each method to its Supabase endpoint and the role that may call it.
 */

export type AppRole = "player" | "admin" | "super_admin";
export type AccountStatus = "active" | "suspended" | "self_excluded" | "closed";
export type KycStatus = "not_started" | "pending" | "verified" | "rejected";
export type TransactionStatus = "pending" | "completed" | "failed" | "cancelled";
export type LedgerType = "deposit" | "withdrawal" | "box_open" | "sell_back" | "adjustment" | "shipping_fee" | "refund";
export type BoxStatus = "draft" | "live" | "retired";

/** Stable error codes. SQL functions raise them as the exception message; auth errors are mapped. */
export const BACKEND_ERRORS = [
  "not_authenticated",
  "invalid_credentials",
  "email_not_verified",
  "email_taken",
  "invalid_code",
  "account_not_active",
  "staff_account",
  "forbidden",
  "insufficient_funds",
  "invalid_amount",
  "amount_above_limit",
  "amount_below_minimum",
  "kyc_required",
  "box_not_available",
  "odds_misconfigured",
  "odds_frozen",
  "odds_do_not_sum",
  "nothing_to_sell",
  "item_not_held",
  "not_shippable",
  "shipment_not_cancellable",
  "transaction_not_found",
  "transaction_not_pending",
  "invalid_client_seed",
  "player_not_found",
  "cannot_change_self",
  "last_super_admin",
  "invalid_adjustment",
  "not_configured",
  "unknown",
] as const;
export type BackendErrorCode = (typeof BACKEND_ERRORS)[number];

export class BackendError extends Error {
  constructor(
    readonly code: BackendErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "BackendError";
  }
}

/** "odds_do_not_sum: box x weights total …" → "odds_do_not_sum". */
export function toErrorCode(message: string | undefined): BackendErrorCode {
  const head = (message ?? "").split(":")[0].trim();
  return (BACKEND_ERRORS as readonly string[]).includes(head) ? (head as BackendErrorCode) : "unknown";
}

// Player side ------------------------------------------------------------------------------------

/** /register: MISTY's fields plus a password. */
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneCountry: string;
  phoneDial: string;
  phoneNumber: string;
  marketingOptIn: boolean;
  acceptedTerms: boolean;
  confirmedAge: boolean;
}

export interface PlayerStats {
  openings: number;
  playedCents: Cents;
  earnedCents: Cents;
  houseNetCents: Cents;
  firstPlayedAt: string | null;
  lastPlayedAt: string | null;
  soldBackCents: Cents;
  depositsCents: Cents;
  withdrawalsCents: Cents;
  piecesHeld: number;
}

/** The player card: /account for the player, the back-office drawer for staff. */
export interface PlayerCard {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: { country: string | null; dial: string | null; number: string | null };
  state: string | null;
  role: AppRole;
  status: AccountStatus;
  kycStatus: KycStatus;
  marketingOptIn: boolean;
  registeredAt: string;
  lastSeenAt: string | null;
  wallet: { balanceCents: Cents; heldCents: Cents; currency: string };
  stats: PlayerStats;
}

export interface PaymentResult {
  transactionId: string;
  status: TransactionStatus;
  balanceCents: Cents;
}

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  status: TransactionStatus;
  amountCents: Cents;
  balanceAfterCents: Cents | null;
  note: string | null;
  createdAt: string;
}

export interface OpenBoxResult {
  openingId: string;
  inventoryItemId: string;
  itemId: string;
  itemValueCents: Cents;
  roll: number;
  nonce: number;
  clientSeed: string;
  serverSeedHash: string;
  balanceCents: Cents;
}

export interface SellBackResult {
  creditedCents: Cents;
  sold: number;
  balanceCents: Cents;
}

export interface SeedsView {
  active: { serverSeedHash: string; clientSeed: string; nonce: number };
  revealed: { serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number; revealedAt: string }[];
}

export interface PlayerApi {
  register(input: RegisterInput): Promise<{ email: string }>;
  verifyEmailCode(email: string, code: string): Promise<PlayerCard>;
  resendCode(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<PlayerCard>;
  signOut(): Promise<void>;
  getPlayerCard(): Promise<PlayerCard>;
  updateProfile(patch: Partial<Pick<RegisterInput, "firstName" | "lastName" | "phoneCountry" | "phoneDial" | "phoneNumber" | "marketingOptIn">>): Promise<void>;
  requestDeposit(amountCents: Cents): Promise<PaymentResult>;
  requestWithdrawal(amountCents: Cents): Promise<PaymentResult>;
  cancelWithdrawal(transactionId: string): Promise<PaymentResult>;
  listTransactions(limit?: number): Promise<LedgerEntry[]>;
  openBox(boxId: string): Promise<OpenBoxResult>;
  sellBack(inventoryItemIds: string[]): Promise<SellBackResult>;
  requestShipping(inventoryItemId: string, address: Record<string, string>): Promise<{ shipmentId: string }>;
  cancelShipping(inventoryItemId: string): Promise<void>;
  getSeeds(): Promise<SeedsView>;
  setClientSeed(clientSeed: string): Promise<SeedsView>;
  rotateSeeds(): Promise<SeedsView>;
}

// Back office ------------------------------------------------------------------------------------

/** Inclusive UTC date range, "YYYY-MM-DD". */
export interface DateRange {
  from: string;
  to: string;
}

export interface PlayerOverviewRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneDial: string | null;
  phoneNumber: string | null;
  state: string | null;
  status: AccountStatus;
  kycStatus: KycStatus;
  marketingOptIn: boolean;
  registeredAt: string;
  lastSeenAt: string | null;
  openings: number;
  playedCents: Cents;
  earnedCents: Cents;
  houseNetCents: Cents;
  firstPlayedAt: string | null;
  lastPlayedAt: string | null;
  soldBackCents: Cents;
  depositsCents: Cents;
  withdrawalsCents: Cents;
  balanceCents: Cents;
}

export interface DailyMetric {
  day: string;
  registrations: number;
  playersPlayed: number;
  firstTimePlayers: number;
  openings: number;
  playedCents: Cents;
  earnedCents: Cents;
  depositsCents: Cents;
  withdrawalsCents: Cents;
}

export interface Kpis {
  registeredTotal: number;
  registeredInRange: number;
  playersPlayedEver: number;
  playersPlayedInRange: number;
  openings: number;
  playedCents: Cents;
  earnedCents: Cents;
  houseNetCents: Cents;
  depositsCents: Cents;
  withdrawalsCents: Cents;
  soldBackCents: Cents;
  pendingWithdrawals: number;
}

export interface BoxPerformanceRow {
  boxId: string;
  name: string;
  status: BoxStatus;
  priceCents: Cents;
  expectedRtp: number;
  openings: number;
  playedCents: Cents;
  earnedCents: Cents;
  actualRtp: number | null;
}

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Exclude<AppRole, "player">;
  grantedAt: string;
  status: AccountStatus;
  lastSeenAt: string | null;
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorRole: AppRole | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface BackOfficeApi {
  kpis(range: DateRange): Promise<Kpis>;
  dailyMetrics(range: DateRange): Promise<DailyMetric[]>;
  listPlayers(): Promise<PlayerOverviewRow[]>;
  getPlayer(playerId: string): Promise<PlayerCard>;
  listPlayerTransactions(playerId: string, limit?: number): Promise<LedgerEntry[]>;
  setPlayerStatus(playerId: string, status: AccountStatus, reason?: string): Promise<void>;
  boxPerformance(range: DateRange): Promise<BoxPerformanceRow[]>;
  settleTransaction(transactionId: string, outcome: Exclude<TransactionStatus, "pending">): Promise<PaymentResult>;
  /** super_admin only. */
  listStaff(): Promise<StaffMember[]>;
  /** super_admin only. */
  setRole(userId: string, role: AppRole): Promise<void>;
  /** super_admin only. */
  adjustBalance(playerId: string, amountCents: Cents, note: string): Promise<{ balanceCents: Cents }>;
  /** super_admin only. */
  listAuditLog(limit?: number): Promise<AuditEntry[]>;
}

/** What each role may do. The SQL functions enforce the same rules server-side. */
export const PERMISSIONS = {
  play: ["player"],
  "backoffice.view": ["admin", "super_admin"],
  "players.view": ["admin", "super_admin"],
  "players.suspend": ["admin", "super_admin"],
  "payments.settle": ["admin", "super_admin"],
  "catalog.manage": ["admin", "super_admin"],
  "staff.manage": ["super_admin"],
  "wallet.adjust": ["super_admin"],
  "audit.view": ["super_admin"],
  "settings.edit": ["super_admin"],
} as const satisfies Record<string, readonly AppRole[]>;
export type Permission = keyof typeof PERMISSIONS;

export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as readonly AppRole[]).includes(role);
}

export const ROLE_LABEL: Record<AppRole, string> = {
  player: "Player",
  admin: "Admin",
  super_admin: "Super admin",
};

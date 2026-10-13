import { BoxApiError, type BoxApi, type OpenCommitted, type OpenResolved, type PayMethod } from "@/box-api/contract";
import type { PendingOpen } from "@/store/session";

/**
 * The box page's side of an open, outside React so it can be tested: prepare (or resume) the
 * open whose seal the player sees, then seed → pay → spin. The pay key is saved before paying
 * so a retry or a reload reuses it; the server, not this code, decides the result.
 */

export type Prepared =
  | { kind: "ready"; open: OpenCommitted; pending: PendingOpen; notice: string | null }
  /** A pending open was already paid or resolved (e.g. the page reloaded mid-open): show its result. */
  | { kind: "resolved"; result: OpenResolved };

async function fresh(api: BoxApi, slug: string, notice: string | null): Promise<Prepared> {
  const open = await api.createOpen(slug);
  return { kind: "ready", open, pending: { openId: open.openId, payKey: null }, notice };
}

export async function prepareOpen(api: BoxApi, slug: string, pending: PendingOpen | undefined): Promise<Prepared> {
  if (!pending) return fresh(api, slug, null);
  let open;
  try {
    open = await api.getOpen(pending.openId);
  } catch (e) {
    if (e instanceof BoxApiError && e.status === 404) return fresh(api, slug, null);
    throw e;
  }
  if (open.status === "created") return { kind: "ready", open, pending, notice: null };
  if (open.status === "paid") return { kind: "resolved", result: await api.spin(open.openId) };
  if (open.status === "resolved") return { kind: "resolved", result: open };
  // Only worth saying if the player tried to pay; an unattempted open just gets a new seal.
  return fresh(api, slug, pending.payKey ? "Your last open expired before payment. A new one is ready." : null);
}

export async function runOpen(
  api: BoxApi,
  a: { pending: PendingOpen; seed: string; method: PayMethod; newKey: () => string; savePending: (p: PendingOpen) => void },
): Promise<OpenResolved> {
  const payKey = a.pending.payKey ?? a.newKey();
  if (a.pending.payKey !== payKey) a.savePending({ ...a.pending, payKey });
  const current = await api.getOpen(a.pending.openId);
  if (current.status === "resolved") return current;
  if (current.status === "expired") throw new BoxApiError(409, "expired");
  if (current.status === "created") {
    if (a.seed && current.clientSeed !== a.seed) await api.setClientSeed(current.openId, a.seed);
    await api.pay(current.openId, { method: a.method, idempotencyKey: payKey });
  }
  return api.spin(current.openId);
}

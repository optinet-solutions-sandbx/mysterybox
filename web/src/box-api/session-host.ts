"use client";

import { useAuth } from "@/store/auth";
import { useSession } from "@/store/session";
import type { MockHost } from "./mock";

/** The mock server's storage in the app: the signed-in account's session (swapped per account). */
export const sessionHost: MockHost = {
  read() {
    const auth = useAuth.getState();
    const s = useSession.getState();
    const account = auth.currentEmail ? auth.accounts[auth.currentEmail] : undefined;
    return { accountId: account?.id ?? null, usd: s.balance, transactions: s.transactions, inventory: s.inventory, box: s.boxApi };
  },
  write(w) {
    useSession.setState({ balance: w.usd, transactions: w.transactions, inventory: w.inventory, boxApi: w.box });
  },
};

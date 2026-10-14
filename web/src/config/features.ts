import { economy } from "./economy";

/**
 * Product switches, read at build time like the other NEXT_PUBLIC_ settings (docs/11-white-label.md).
 *
 * NEXT_PUBLIC_TRADE_IN=off hides trade-in for site credit wherever players see it: pieces are kept
 * or shipped. The box system's API still offers trade-in until the backend developer turns it off
 * there too (docs/10-box-system-handoff.md).
 */
export const tradeInEnabled = process.env.NEXT_PUBLIC_TRADE_IN !== "off";

/** The trade-in rate as players read it, e.g. "90%". */
export const tradeInRate = `${Math.round(economy.sellBackRate * 100)}%`;

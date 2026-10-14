import { economy } from "./economy";

/**
 * Trade-in for site credit. With Supabase it is the `trade_in_enabled` setting a super admin
 * switches on the Configuration page (read with the catalogue: services/catalog-source
 * `loadSiteSettings`, client components `useTradeIn()`). Without Supabase this default applies:
 * NEXT_PUBLIC_TRADE_IN=off turns it off. Off hides trade-in wherever players see it; the box
 * system's API still offers it until the backend developer turns it off there too.
 */
export const tradeInDefault = process.env.NEXT_PUBLIC_TRADE_IN !== "off";

/** The trade-in rate as players read it, e.g. "90%". */
export const tradeInRate = `${Math.round(economy.sellBackRate * 100)}%`;

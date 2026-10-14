"use client";

import { createContext, use, useEffect, useMemo, type ReactNode } from "react";
import { createCatalog, setActiveCatalog, staticCatalog, type Catalog, type CatalogData } from "@/services/catalog";

const CatalogContext = createContext<Catalog>(staticCatalog);

/** Hands the server-loaded catalog to client components, so server and client render the same data. */
export function CatalogProvider({ data, children }: { data: CatalogData; children: ReactNode }) {
  const catalog = useMemo(() => createCatalog(data), [data]);
  useEffect(() => setActiveCatalog(catalog), [catalog]);
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalog(): Catalog {
  return use(CatalogContext);
}

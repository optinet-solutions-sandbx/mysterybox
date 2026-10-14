"use client";

import { createContext, use, type ReactNode } from "react";
import { createCatalog, setActiveCatalog, staticCatalog, type Catalog, type CatalogData } from "@/services/catalog";

const CatalogContext = createContext<Catalog>(staticCatalog);
const built = new WeakMap<CatalogData, Catalog>();

/** One catalog per server payload; it becomes the active one before any child renders. */
function catalogFor(data: CatalogData): Catalog {
  let catalog = built.get(data);
  if (!catalog) {
    catalog = createCatalog(data);
    built.set(data, catalog);
  }
  setActiveCatalog(catalog);
  return catalog;
}

/** Hands the server-loaded catalog to client components, so server and client render the same data. */
export function CatalogProvider({ data, children }: { data: CatalogData; children: ReactNode }) {
  const catalog = catalogFor(data);
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalog(): Catalog {
  return use(CatalogContext);
}

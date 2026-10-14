// Sub-tabs de la sección "Catálogo" (DESIGN.md §3.1). Se promovieron aquí en
// SCRUM-86, cuando "Mis productos" (features/my-products) se volvió el
// segundo consumidor junto con "Buscar" (features/catalog) — mismo criterio
// que recipes-tabs.constants.ts.

export const CATALOG_TAB = {
  MY_PRODUCTS: "my-products",
  SEARCH: "search",
} as const;

export type CatalogTabType = (typeof CATALOG_TAB)[keyof typeof CATALOG_TAB];

// Orden en que se dibujan los tabs. isAvailable = false: se ve, pero todavía
// no navega (cuando exista "Mis productos" pasa a true y gana su ruta).
export const CATALOG_TABS = [
  { id: CATALOG_TAB.SEARCH, isAvailable: true, label: "Buscar" },
  { id: CATALOG_TAB.MY_PRODUCTS, isAvailable: false, label: "Mis productos" },
] as const satisfies ReadonlyArray<{ id: CatalogTabType; isAvailable: boolean; label: string }>;

export const CATALOG_TABS_TEXT = {
  COMING_SOON: "· Próximamente",
  NAV_LABEL: "Secciones del catálogo",
} as const;

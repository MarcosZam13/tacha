import { APP_ROUTE } from "./routes.constants";

// Sub-tabs de la sección "Catálogo" (DESIGN.md §3.1). Los usan "Buscar"
// (features/catalog) y "Mis productos" (features/my-products) — mismo
// criterio que recipes-tabs.constants.ts. Desde SCRUM-86 cada tab tiene su
// propia ruta, así que ambos son siempre navegables (ya no hay "Próximamente").

export const CATALOG_TAB = {
  MY_PRODUCTS: "my-products",
  SEARCH: "search",
} as const;

export type CatalogTabType = (typeof CATALOG_TAB)[keyof typeof CATALOG_TAB];

export const CATALOG_TAB_LABEL = {
  [CATALOG_TAB.MY_PRODUCTS]: "Mis productos",
  [CATALOG_TAB.SEARCH]: "Buscar",
} as const satisfies Record<CatalogTabType, string>;

// Orden en que se dibujan los tabs. Cada uno es un link a su pantalla.
export const CATALOG_TABS = [
  { href: APP_ROUTE.CATALOG, id: CATALOG_TAB.SEARCH, label: CATALOG_TAB_LABEL[CATALOG_TAB.SEARCH] },
  {
    href: APP_ROUTE.CATALOG_MY_PRODUCTS,
    id: CATALOG_TAB.MY_PRODUCTS,
    label: CATALOG_TAB_LABEL[CATALOG_TAB.MY_PRODUCTS],
  },
] as const satisfies ReadonlyArray<{ href: string; id: CatalogTabType; label: string }>;

export const CATALOG_TABS_TEXT = {
  NAV_LABEL: "Secciones del catálogo",
  // Título de la sección, igual en "Buscar" y en "Mis productos": una sola
  // constante para que no diverjan (antes vivía como CATALOG_TEXT.TITLE en
  // features/catalog, movida aquí en SCRUM-86).
  SECTION_TITLE: "Catálogo",
} as const;

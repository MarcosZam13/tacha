import { APP_ROUTE, PRODUCT_SEARCH } from "@/constants";

// Constantes propias de la pantalla "Buscar" del catálogo. Viven dentro de la
// feature porque ninguna otra las usa todavía; se promueven a constants/ con
// el segundo consumidor. Los textos del buscador (etiqueta, placeholder,
// error) ya son compartidos: PRODUCT_SEARCH_TEXT en constants/catalog.constants.ts.

export const CATALOG_ROUTE = {
  SEARCH: APP_ROUTE.CATALOG,
} as const;

// Estados de la pantalla (utils/getCatalogSearchStatus.ts): se derivan de lo
// que expone useProductSearch, no se guardan.
export const CATALOG_SEARCH_STATUS = {
  EMPTY: "empty",
  ERROR: "error",
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
} as const;

export type CatalogSearchStatusType =
  (typeof CATALOG_SEARCH_STATUS)[keyof typeof CATALOG_SEARCH_STATUS];

// Sub-tabs de la sección "Catálogo" (DESIGN.md §3.1). "Mis productos" es otra historia.
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

// "Leche — 1L": producto y tamaño, sin marca (documento-proyecto §4.5).
export const CATALOG_CARD = {
  TITLE_SEPARATOR: " — ",
} as const;

export const CATALOG_TEXT = {
  COMING_SOON: "· Próximamente",
  EMPTY_SUGGESTION: "Si no existe, puedes crearlo en \"Mis productos\".",
  IDLE_HINT: `Escribe al menos ${PRODUCT_SEARCH.MIN_QUERY_LENGTH} letras para buscar.`,
  NO_PRICE: "Sin precio disponible",
  SEARCHING: "Buscando…",
  TABS_LABEL: "Secciones del catálogo",
  TITLE: "Catálogo",
} as const;

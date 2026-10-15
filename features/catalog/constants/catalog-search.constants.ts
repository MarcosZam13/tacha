import { APP_ROUTE, PRODUCT_SEARCH } from "@/constants";

// Constantes propias de la pantalla "Buscar" del catálogo. Viven dentro de la
// feature porque ninguna otra las usa todavía. Los sub-tabs (CATALOG_TAB,
// CATALOG_TABS) y la tarjeta (CATALOG_CARD) se promovieron a constants/ y
// components/ en SCRUM-86, cuando "Mis productos" se volvió el segundo
// consumidor.

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

export const CATALOG_TEXT = {
  EMPTY_SUGGESTION: "Si no existe, puedes crearlo en \"Mis productos\".",
  IDLE_HINT: `Escribe al menos ${PRODUCT_SEARCH.MIN_QUERY_LENGTH} letras para buscar.`,
  SEARCHING: "Buscando…",
} as const;

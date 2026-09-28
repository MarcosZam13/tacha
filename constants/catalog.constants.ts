// Constantes del catálogo compartidas entre features (hoy: lista general y recetas).

// MIN_QUERY_LENGTH tiene que coincidir con min_search_length de la RPC
// search_catalog: por debajo la base devuelve 0 filas y no vale la pena llamarla.
// MAX_QUERY_LENGTH evita mandarle a la búsqueda por similitud un texto enorme.
export const PRODUCT_SEARCH = {
  DEBOUNCE_MS: 300,
  MAX_QUERY_LENGTH: 80,
  MIN_QUERY_LENGTH: 2,
} as const;

// Espejo del check de product_catalog_variants.base_unit en la base.
export const CATALOG_BASE_UNIT = {
  GRAMS: "g",
  MILLILITERS: "ml",
  UNIT: "unidad",
} as const;

export type CatalogBaseUnitType =
  (typeof CATALOG_BASE_UNIT)[keyof typeof CATALOG_BASE_UNIT];

export const CATALOG_DB = {
  RPC: {
    SEARCH_CATALOG: "search_catalog",
  },
} as const;

export const PRODUCT_SEARCH_TEXT = {
  LABEL: "Buscar producto",
  NO_RESULTS: "No encontramos productos con ese nombre.",
  PLACEHOLDER: "Busca un producto, ej. leche",
  SEARCH_ERROR: "No se pudo buscar en el catálogo. Intenta de nuevo.",
} as const;

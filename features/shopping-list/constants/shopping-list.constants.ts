// Constantes propias de la lista general. Viven dentro de la feature porque
// ninguna otra las usa todavía; se promueven a constants/ con el segundo consumidor.

// Tiene que coincidir con min_search_length de la RPC search_catalog:
// por debajo de ese largo la base devuelve 0 filas y no vale la pena llamarla.
export const PRODUCT_SEARCH = {
  DEBOUNCE_MS: 300,
  MIN_QUERY_LENGTH: 2,
} as const;

// Espejo del check de lists.type en la base (documento-proyecto §6).
export const LIST_TYPE = {
  DATE: "date",
  GENERAL: "general",
  PRIVATE: "private",
} as const;

export type ListTypeType = (typeof LIST_TYPE)[keyof typeof LIST_TYPE];

// Espejo del check de product_catalog_variants.base_unit en la base.
export const CATALOG_BASE_UNIT = {
  GRAMS: "g",
  MILLILITERS: "ml",
  UNIT: "unidad",
} as const;

export type CatalogBaseUnitType =
  (typeof CATALOG_BASE_UNIT)[keyof typeof CATALOG_BASE_UNIT];

// Record<CatalogBaseUnitType, ...> obliga a tener una etiqueta por cada unidad:
// si la base suma una unidad nueva y se agrega arriba, esto deja de compilar.
export const CATALOG_BASE_UNIT_LABEL: Record<CatalogBaseUnitType, string> = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "u",
};

export const SHOPPING_LIST_DB = {
  RPC: {
    ADD_ITEM_TO_GENERAL_LIST: "add_item_to_general_list",
    SEARCH_CATALOG: "search_catalog",
  },
  TABLE: {
    LISTS: "lists",
    LIST_ITEMS: "list_items",
  },
} as const;

export const SHOPPING_LIST_TEXT = {
  ADD_ERROR: "No se pudo añadir el producto. Intenta de nuevo.",
  EMPTY_LIST: "Tu lista está vacía. Busca un producto para empezar.",
  LOAD_ERROR: "No se pudo cargar tu lista. Intenta de nuevo.",
  NO_RESULTS: "No encontramos productos con ese nombre.",
  SEARCH_ERROR: "No se pudo buscar en el catálogo. Intenta de nuevo.",
  SEARCH_LABEL: "Buscar producto",
  SEARCH_PLACEHOLDER: "Busca un producto, ej. leche",
  TITLE: "Lista general",
} as const;

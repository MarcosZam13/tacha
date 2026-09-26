// Constantes propias de la lista general. Viven dentro de la feature porque
// ninguna otra las usa todavía; se promueven a constants/ con el segundo consumidor.

// MIN_QUERY_LENGTH tiene que coincidir con min_search_length de la RPC
// search_catalog: por debajo la base devuelve 0 filas y no vale la pena llamarla.
// MAX_QUERY_LENGTH evita mandarle a la búsqueda por similitud un texto enorme.
export const PRODUCT_SEARCH = {
  DEBOUNCE_MS: 300,
  MAX_QUERY_LENGTH: 80,
  MIN_QUERY_LENGTH: 2,
} as const;

// MIN es espejo del check quantity_requested >= 1 de list_items: la UI
// deshabilita el "−" ahí, y la base lo rechaza igual si alguien lo salta.
// STEP son los únicos deltas que acepta la RPC change_item_quantity.
export const ITEM_QUANTITY = {
  MIN: 1,
  STEP: {
    DECREASE: -1,
    INCREASE: 1,
  },
} as const;

export type ItemQuantityStepType =
  (typeof ITEM_QUANTITY.STEP)[keyof typeof ITEM_QUANTITY.STEP];

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

// satisfies Record<CatalogBaseUnitType, ...> obliga a tener una etiqueta por
// cada unidad (si se agrega una unidad arriba, esto deja de compilar) sin
// perder los tipos literales de as const.
export const CATALOG_BASE_UNIT_LABEL = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "u",
} as const satisfies Record<CatalogBaseUnitType, string>;

export const SHOPPING_LIST_DB = {
  // Embebe items → variante → producto madre en una sola petición (PostgREST).
  // Los nombres de columnas (aquí y en los .eq() del servicio) no llevan
  // constante propia: el genérico Database de types/database.types.ts los
  // valida al compilar, que es lo mismo que buscaría la constante.
  GENERAL_LIST_SELECT:
    "list_items(id, quantity_requested, created_at, product_catalog_variants(id, base_unit, base_quantity, product_catalog(name)))",
  RPC: {
    ADD_ITEM_TO_GENERAL_LIST: "add_item_to_general_list",
    CHANGE_ITEM_QUANTITY: "change_item_quantity",
    SEARCH_CATALOG: "search_catalog",
  },
  TABLE: {
    LISTS: "lists",
    LIST_ITEMS: "list_items",
  },
} as const;

// Acciones del reducer de la lista (utils/shopping-list.reducer.ts).
export const SHOPPING_LIST_ACTION = {
  ADD_FAILED: "addFailed",
  ITEM_UPSERTED: "itemUpserted",
  LOADED: "loaded",
  LOAD_FAILED: "loadFailed",
  QUANTITY_CHANGED: "quantityChanged",
  QUANTITY_CHANGE_FAILED: "quantityChangeFailed",
  QUANTITY_CHANGE_STARTED: "quantityChangeStarted",
} as const;

export const SHOPPING_LIST_TEXT = {
  ADD_ERROR: "No se pudo añadir el producto. Intenta de nuevo.",
  DECREASE_QUANTITY: "Quitar uno",
  EMPTY_LIST: "Tu lista está vacía. Busca un producto para empezar.",
  INCREASE_QUANTITY: "Añadir uno",
  LOAD_ERROR: "No se pudo cargar tu lista. Intenta de nuevo.",
  NO_RESULTS: "No encontramos productos con ese nombre.",
  QUANTITY_ERROR: "No se pudo cambiar la cantidad. Intenta de nuevo.",
  SEARCH_ERROR: "No se pudo buscar en el catálogo. Intenta de nuevo.",
  SEARCH_LABEL: "Buscar producto",
  SEARCH_PLACEHOLDER: "Busca un producto, ej. leche",
  TITLE: "Lista general",
} as const;

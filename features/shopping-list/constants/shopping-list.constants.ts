import { CATALOG_BASE_UNIT } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";

// Constantes propias de la lista general. Viven dentro de la feature porque
// ninguna otra las usa todavía; se promueven a constants/ con el segundo consumidor.

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
  // Detalle de una variante: sus marcas y el último precio de cada marca en
  // cada tienda (la vista latest_prices ya se queda con el más reciente).
  ITEM_DETAIL_SELECT: "product_brands(name), latest_prices(price, stores(display_name))",
  RPC: {
    ADD_ITEM_TO_GENERAL_LIST: "add_item_to_general_list",
    CHANGE_ITEM_QUANTITY: "change_item_quantity",
  },
  TABLE: {
    LISTS: "lists",
    LIST_ITEMS: "list_items",
    VARIANTS: "product_catalog_variants",
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

// Precios del catálogo: colones, sin decimales (los súper no cobran céntimos).
export const PRICE_FORMAT = {
  CURRENCY: "CRC",
  LOCALE: "es-CR",
  MAX_FRACTION_DIGITS: 0,
  RANGE_SEPARATOR: " – ",
} as const;

export const SHOPPING_LIST_TEXT = {
  ADD_ERROR: "No se pudo añadir el producto. Intenta de nuevo.",
  DECREASE_QUANTITY: "Quitar uno",
  DETAIL_BRANDS: "Marcas",
  DETAIL_CLOSE: "Cerrar",
  DETAIL_ERROR: "No se pudo cargar el detalle. Intenta de nuevo.",
  DETAIL_NO_BRANDS: "Sin marcas registradas.",
  DETAIL_NO_PRICES: "Todavía no hay precios de referencia.",
  DETAIL_PRESENTATION: "Presentación",
  DETAIL_PRICES: "Precio de referencia por supermercado",
  EMPTY_LIST: "Tu lista está vacía. Busca un producto para empezar.",
  INCREASE_QUANTITY: "Añadir uno",
  LOAD_ERROR: "No se pudo cargar tu lista. Intenta de nuevo.",
  OPEN_DETAIL: "Ver detalle",
  OPEN_DETAIL_ICON: "i",
  QUANTITY_ERROR: "No se pudo cambiar la cantidad. Intenta de nuevo.",
  TITLE: "Lista general",
} as const;

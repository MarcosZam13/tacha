// Constantes propias de la lista general.
// ITEM_QUANTITY y las RPC de list_items se promovieron a
// constants/list-items.constants.ts (SCRUM-85): catalog-product-detail
// también agrega productos y cambia su cantidad. Se reexportan aquí para no
// tocar los imports que ya existían en esta feature.
export { ITEM_QUANTITY } from "@/constants/list-items.constants";
export type { ItemQuantityStepType } from "@/constants/list-items.constants";

// Cuánto se ve el toast de "Producto eliminado". Es también el plazo para
// deshacer: el borrado en la base sale recién cuando vence.
export const ITEM_REMOVAL = {
  UNDO_WINDOW_MS: 5000,
} as const;

// Espejo del check de lists.type en la base (documento-proyecto §6).
export const LIST_TYPE = {
  DATE: "date",
  GENERAL: "general",
  PRIVATE: "private",
} as const;

export type ListTypeType = (typeof LIST_TYPE)[keyof typeof LIST_TYPE];

export const SHOPPING_LIST_DB = {
  // Embebe items → variante → producto madre en una sola petición (PostgREST).
  // Los nombres de columnas (aquí y en los .eq() del servicio) no llevan
  // constante propia: el genérico Database de types/database.types.ts los
  // valida al compilar, que es lo mismo que buscaría la constante.
  // id: para distinguir la lista personal de la de la familia (SCRUM-59).
  GENERAL_LIST_SELECT:
    "id, list_items(id, quantity_requested, checked_at, purchase_session_id, quantity_bought, created_at, product_catalog_variants(id, base_unit, base_quantity, product_catalog(name)))",
  // Detalle de una variante: sus marcas y el último precio de cada marca en
  // cada tienda (la vista latest_prices ya se queda con el más reciente).
  ITEM_DETAIL_SELECT: "product_brands(name), latest_prices(price, stores(display_name))",
  RPC: {
    CHANGE_BOUGHT_QUANTITY: "change_bought_quantity",
    CHECK_LIST_ITEM_IN_SESSION: "check_list_item_in_session",
    // La lista general de quien llama: la de su familia o la personal (024, SCRUM-59).
    FIND_GENERAL_LIST_ID: "find_general_list_id",
    // Avisos de faltante de receta de la lista general, con el nombre de la receta (033, SCRUM-114).
    GET_GENERAL_LIST_SHORTFALLS: "get_general_list_shortfalls",
    SET_LIST_ITEM_CHECKED: "set_list_item_checked",
  },
  TABLE: {
    LISTS: "lists",
    LIST_ITEMS: "list_items",
    VARIANTS: "product_catalog_variants",
  },
} as const;

// id del bloque de avisos de una fila (SCRUM-114): el botón de tachar lo
// referencia con aria-describedby. Lleva el id de la fila para ser único.
export const SHORTFALL_NOTES_ID_PREFIX = "shortfall-notes-";

// Acciones del reducer de la lista (utils/shopping-list.reducer.ts).
export const SHOPPING_LIST_ACTION = {
  ADD_FAILED: "addFailed",
  BOUGHT_QUANTITY_CHANGED: "boughtQuantityChanged",
  CHECK_TOGGLED: "checkToggled",
  CHECK_TOGGLE_FAILED: "checkToggleFailed",
  CHECK_TOGGLE_STARTED: "checkToggleStarted",
  ITEM_REMOVED: "itemRemoved",
  ITEM_UPSERTED: "itemUpserted",
  LOADED: "loaded",
  LOAD_FAILED: "loadFailed",
  QUANTITY_CHANGED: "quantityChanged",
  QUANTITY_CHANGE_FAILED: "quantityChangeFailed",
  QUANTITY_CHANGE_STARTED: "quantityChangeStarted",
  REMOVE_FAILED: "removeFailed",
} as const;

export const SHOPPING_LIST_TEXT = {
  ADD_ERROR: "No se pudo añadir el producto. Intenta de nuevo.",
  ALL_CHECKED: "Todo tachado. No queda nada pendiente.",
  CHECKED_SECTION: "Tachados hoy",
  CHECK_ERROR: "No se pudo tachar el producto. Intenta de nuevo.",
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
  // SCRUM-59 (D4): la lista personal que se eligió mantener al unirse a una familia.
  KEPT_PERSONAL_NOTE: "Solo tú la ves. Lo que agregues ahora va a la lista de tu familia.",
  // Antes de la cantidad en la sección de solo lectura ("×2"): sin stepper.
  KEPT_PERSONAL_QUANTITY_PREFIX: "×",
  KEPT_PERSONAL_SECTION: "Mi lista personal",
  LOAD_ERROR: "No se pudo cargar tu lista. Intenta de nuevo.",
  OPEN_DETAIL: "Ver detalle",
  OPEN_DETAIL_ICON: "i",
  PENDING_SECTION: "Pendientes",
  REMOVE_ERROR: "No se pudo eliminar el producto. Intenta de nuevo.",
  REMOVE_ITEM: "Eliminar",
  REMOVE_ITEM_ICON: "✕",
  REMOVED_TOAST: "Producto eliminado",
  // Aviso de faltante (SCRUM-114): "+ 600 ml necesarios para Tres leches".
  SHORTFALL_NOTE_FOR: "necesarios para",
  SHORTFALL_NOTE_PREFIX: "+",
  UNDO_REMOVE: "Deshacer",
  QUANTITY_ERROR: "No se pudo cambiar la cantidad. Intenta de nuevo.",
  TITLE: "Lista general",
} as const;

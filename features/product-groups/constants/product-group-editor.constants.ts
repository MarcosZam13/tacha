// Editor de grupos (SCRUM-110 / HU-73). Las constantes de "Mis grupos"
// (HU-72) están en product-groups.constants.ts.

/**
 * Límites de un grupo. Espejo de los checks de la 054 y de
 * create_product_group (056): acá es para avisar antes de mandar; la base es
 * la garantía.
 */
export const PRODUCT_GROUP_LIMIT = {
  ITEMS_MAX: 50,
  NAME_MAX_LENGTH: 60,
  QUANTITY_MAX: 99,
  QUANTITY_MIN: 1,
} as const;

export const PRODUCT_GROUP_EDITOR_STATUS = {
  EDITING: "editing",
  ERROR: "error",
  SAVING: "saving",
} as const;

export type ProductGroupEditorStatusType =
  (typeof PRODUCT_GROUP_EDITOR_STATUS)[keyof typeof PRODUCT_GROUP_EDITOR_STATUS];

// La casilla "Compartir con mi familia": se sabe recién cuando responde
// hasHousehold(); sin familia no se muestra (CA-03).
export const PRODUCT_GROUP_SHARE_VISIBILITY = {
  HIDDEN: "hidden",
  LOADING: "loading",
  VISIBLE: "visible",
} as const;

export type ProductGroupShareVisibilityType =
  (typeof PRODUCT_GROUP_SHARE_VISIBILITY)[keyof typeof PRODUCT_GROUP_SHARE_VISIBILITY];

// Cuánto cambia la cantidad cada botón del stepper.
export const PRODUCT_GROUP_QUANTITY_STEP = {
  DECREASE: -1,
  INCREASE: 1,
} as const;

export type ProductGroupQuantityStepType =
  (typeof PRODUCT_GROUP_QUANTITY_STEP)[keyof typeof PRODUCT_GROUP_QUANTITY_STEP];

export const PRODUCT_GROUP_EDITOR_ACTION = {
  ITEM_ADDED: "itemAdded",
  ITEM_QUANTITY_STEPPED: "itemQuantityStepped",
  ITEM_REMOVED: "itemRemoved",
  NAME_CHANGED: "nameChanged",
  SAVE_FAILED: "saveFailed",
  SAVE_STARTED: "saveStarted",
  SHARE_CHANGED: "shareChanged",
  VALIDATION_FAILED: "validationFailed",
} as const;

export const PRODUCT_GROUP_EDITOR_ERROR = {
  ITEMS_REQUIRED: "Agrega al menos un producto.",
  NAME_REQUIRED: "Escribe un nombre para el grupo.",
  NAME_TOO_LONG: `El nombre puede tener hasta ${PRODUCT_GROUP_LIMIT.NAME_MAX_LENGTH} caracteres.`,
  // + los nombres de los productos, separados por coma (regla 7 del SPEC).
  SHARE_WITH_PERSONAL_PREFIX: "Para compartir el grupo, quita estos productos personales: ",
} as const;

export const PRODUCT_GROUP_EDITOR_TEXT = {
  BACK_TO_GROUPS: "Volver a Mis grupos",
  CANCEL: "Cancelar",
  // Nombres accesibles del stepper y de "Quitar": + "{producto} — {tamaño}".
  DECREASE_PREFIX: "Restar uno a ",
  INCREASE_PREFIX: "Sumar uno a ",
  ITEMS_HINT: "Busca cada producto y elige su presentación. La cantidad es la que agregarás a tu lista.",
  ITEMS_LABEL: "Productos",
  NAME_LABEL: "Nombre del grupo",
  NAME_PLACEHOLDER: "Ej. Desayuno de la semana",
  NO_ITEMS: "Todavía no agregaste productos.",
  REMOVE_ITEM: "Quitar",
  REMOVE_ITEM_PREFIX: "Quitar ",
  SAVE: "Guardar grupo",
  SAVING: "Guardando…",
  SHARE_LABEL: "Compartir con mi familia",
  TITLE: "Crear grupo",
  // Separa los nombres de productos en el error de compartir.
  ITEM_NAMES_SEPARATOR: ", ",
  // role="status" al agregar, sumar o quitar una fila: + "{producto} — {tamaño}".
  ITEM_ADDED_PREFIX: "Se agregó ",
  ITEM_INCREASED_PREFIX: "Se sumó uno a ",
  ITEM_REMOVED_PREFIX: "Se quitó ",
  ITEMS_LIMIT_REACHED: `Llegaste al máximo de ${PRODUCT_GROUP_LIMIT.ITEMS_MAX} productos.`,
  SAVE_ERROR: "No pudimos guardar el grupo. Intenta de nuevo.",
} as const;

// Textos y estados de la pantalla de detalle de producto (SCRUM-85, HU-53).
// Specs en features/catalog-product-detail/specs/.

// Estados de la pantalla (SPEC.md §6): LOADING/ERROR son de la carga del
// detalle (useEffect de useProductDetailViewModel); READY es el estado
// normal, aunque alguna sección salga vacía (sin marcas, sin precios: eso es
// parte de READY, no un error, SPEC.md §4); ADDING es "agregar a mi lista"
// en curso, siempre disparado desde READY y de vuelta a READY al terminar
// (con éxito o con addErrorMessage, nunca queda pegado en ADDING).
export const PRODUCT_DETAIL_STATUS = {
  ADDING: "adding",
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

// SCRUM-163: si un producto personal puede ir a la lista general del usuario.
export const HOUSEHOLD_LIST_BLOCK = {
  ALLOWED: "allowed",
  BLOCKED: "blocked",
  // Todavía no se sabe si el usuario está en una familia: no se ofrece agregar.
  CHECKING: "checking",
} as const;

export type HouseholdListBlockType = (typeof HOUSEHOLD_LIST_BLOCK)[keyof typeof HOUSEHOLD_LIST_BLOCK];

export type ProductDetailStatusType =
  (typeof PRODUCT_DETAIL_STATUS)[keyof typeof PRODUCT_DETAIL_STATUS];

export const PRODUCT_DETAIL_TEXT = {
  ADD_ERROR: "No se pudo agregar el producto. Intenta de nuevo.",
  // Plan.md §3.5d: si falla a mitad de camino, lo ya sumado en la base no se
  // revierte — se informa cuánto quedó agregado en vez de un error genérico.
  ADD_ERROR_PARTIAL_PREFIX: "Se agregó con cantidad ",
  ADD_ERROR_PARTIAL_SUFFIX: ", menos de lo pedido. Puedes ajustarla desde tu lista.",
  ADD_TO_LIST_BUTTON: "Agregar a mi lista",
  ADDED_CONFIRMATION: "Se agregó a tu lista.",
  BRANDS_TITLE: "Marcas disponibles",
  DECREASE_QUANTITY: "Disminuir cantidad",
  INCREASE_QUANTITY: "Aumentar cantidad",
  LOAD_ERROR: "No se pudo cargar el producto. Intenta de nuevo.",
  NO_BRANDS: "No tenemos marcas registradas para este producto.",
  NO_PRICES: "No tenemos precios disponibles para este producto todavía.",
  NOT_FOUND: "No encontramos ese producto.",
  // SCRUM-163: el producto es personal sin compartir y la lista general es la
  // de la familia: los demás miembros no lo podrían ver.
  PERSONAL_IN_HOUSEHOLD_LIST:
    "Este producto es solo tuyo y tu lista es la de tu familia: el resto no podría verlo. Para usarlo en la lista, créalo de nuevo marcando «Compartir con mi familia».",
  PRICES_TITLE: "Precio aproximado por supermercado",
  QUANTITY_LABEL: "Cantidad",
  RETRY: "Reintentar",
} as const;

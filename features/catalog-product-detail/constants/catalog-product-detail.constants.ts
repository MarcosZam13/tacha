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
  PRICES_TITLE: "Precio aproximado por supermercado",
  QUANTITY_LABEL: "Cantidad",
  RETRY: "Reintentar",
} as const;

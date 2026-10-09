// Constantes del modo compra (SCRUM-67). Viven en la feature de la lista
// porque modo compra es la misma pantalla con un paso previo (HU-36f CA-02).

// La compra activa viaja en la URL: /lista?compra=<id>.
export const PURCHASE_SESSION_QUERY = {
  PARAM: "compra",
} as const;

export const PURCHASE_SESSION_DB = {
  RPC: {
    CLOSE: "close_purchase_session",
    START: "start_purchase_session",
  },
  // La compra con el nombre de su súper, en una sola petición.
  SESSION_SELECT: "id, closed_at, stores(display_name)",
  STORES_SELECT: "id, display_name",
  TABLE: {
    PURCHASE_SESSIONS: "purchase_sessions",
    STORES: "stores",
  },
} as const;

// Espejo del check total_amount >= 0 de purchase_sessions (016): la UI no
// deja enviar un negativo y la base lo rechaza igual.
export const SPENT_TOTAL = {
  MIN: 0,
} as const;

export const PURCHASE_SESSION_TEXT = {
  BAR_LABEL: "Modo compra",
  CLOSE: "Cerrar compra",
  CLOSE_ALL_CHECKED: "Ya tachaste todo. ¿Cerramos la compra?",
  CLOSE_ERROR: "No se pudo cerrar la compra. Intenta de nuevo.",
  CLOSE_TITLE: "Cerrar compra",
  EXIT: "Salir",
  FINISH: "Terminar compra",
  INVALID_SESSION: "Esa compra ya no está abierta.",
  KEEP_SHOPPING: "Seguir comprando",
  PICK_STORE_TITLE: "¿Dónde estás comprando?",
  REQUESTED: "Pedido",
  SHOPPING_AT: "Comprando en",
  START: "Iniciar compra",
  START_ERROR: "No se pudo iniciar la compra. Intenta de nuevo.",
  STORES_ERROR: "No se pudieron cargar los supermercados. Intenta de nuevo.",
  TOTAL_ERROR: "Escribe el monto en colones, solo números (ej. 12500).",
  TOTAL_HELPER: "Opcional: puedes cerrar sin el total.",
  TOTAL_LABEL: "Total gastado (₡)",
} as const;

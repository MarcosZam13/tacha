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

// Espejo de total_amount numeric(12, 2) de purchase_sessions (016): caben 10
// dígitos enteros, así que el máximo es 9 999 999 999. La UI no deja enviar
// más y la base lo rechaza igual. Un monto se escribe en colones enteros, con
// separadores de miles opcionales (espacio, punto o coma) en grupos de 3.
export const SPENT_TOTAL = {
  MAX: 9_999_999_999,
  PATTERN: /^(\d+|\d{1,3}([ .,]\d{3})+)$/,
  // Con /g: solo para .replace (quita todos). No usarlo con .test, que con /g recuerda dónde quedó entre llamadas.
  THOUSANDS_SEPARATOR: /[ .,]/g,
} as const;

// Cuándo se ve el panel "Cerrar compra" (hooks/useClosePurchase.ts):
// AUTO: solo si no queda nada pendiente (CA-07); REQUESTED: tocaron "Terminar
// compra"; DISMISSED: tocaron "Seguir comprando" (no vuelve a sugerirse en esa compra).
export const CLOSE_PANEL_MODE = {
  AUTO: "auto",
  DISMISSED: "dismissed",
  REQUESTED: "requested",
} as const;

export type ClosePanelModeType = (typeof CLOSE_PANEL_MODE)[keyof typeof CLOSE_PANEL_MODE];

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
  SESSION_LOAD_ERROR: "No se pudo cargar la compra. Vuelve a iniciarla.",
  SHOPPING_AT: "Comprando en",
  START: "Iniciar compra",
  START_ERROR: "No se pudo iniciar la compra. Intenta de nuevo.",
  STORES_ERROR: "No se pudieron cargar los supermercados. Intenta de nuevo.",
  TOTAL_ERROR: "Escribe el monto en colones, solo números (ej. 12500).",
  TOTAL_HELPER: "Opcional: puedes cerrar sin el total.",
  TOTAL_LABEL: "Total gastado (₡)",
} as const;

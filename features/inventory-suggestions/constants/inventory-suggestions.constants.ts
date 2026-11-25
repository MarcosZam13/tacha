// Constantes de las sugerencias de inventario (SCRUM-102, HU-70).

export const INVENTORY_SUGGESTIONS_DB = {
  RPC: {
    // Lo que probablemente ya se acabó, calculado en la base (migración 061).
    GET_INVENTORY_SUGGESTIONS: "get_inventory_suggestions",
  },
} as const;

export const INVENTORY_SUGGESTIONS_TEXT = {
  // Se completa con el número de días: "Lo compraste hace 9 días".
  LAST_PURCHASE_DAYS_PREFIX: "Lo compraste hace",
  LAST_PURCHASE_DAYS_SUFFIX: "días",
  LAST_PURCHASE_ONE_DAY: "Lo compraste hace 1 día",
  LAST_PURCHASE_TODAY: "Lo compraste hoy",
  // Nombre de la región y título visible de la fila.
  TITLE: "¿Se te acabó?",
} as const;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

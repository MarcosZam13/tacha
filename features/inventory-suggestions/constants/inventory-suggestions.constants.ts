// Constantes de las sugerencias de inventario (SCRUM-102, HU-70; SCRUM-104, HU-71).

export const INVENTORY_SUGGESTIONS_DB = {
  RPC: {
    // La ✕: pospone el producto 7 días en la lista general (migración 064).
    DISMISS_INVENTORY_SUGGESTION: "dismiss_inventory_suggestion",
    // Lo que probablemente ya se acabó, calculado en la base (migraciones 061, 063 y 064).
    GET_INVENTORY_SUGGESTIONS: "get_inventory_suggestions",
  },
} as const;

export const INVENTORY_SUGGESTIONS_TEXT = {
  // Si el ✓ o la ✕ no se pudo guardar; la tarjeta vuelve a aparecer.
  ACTION_ERROR: "No se pudo guardar. Intenta de nuevo.",
  // Nombre accesible del ✓: "Agregar Leche a la lista".
  CONFIRM_ICON: "✓",
  CONFIRM_LABEL_PREFIX: "Agregar",
  CONFIRM_LABEL_SUFFIX: "a la lista",
  // Nombre accesible de la ✕: "Descartar Leche".
  DISMISS_ICON: "✕",
  DISMISS_LABEL_PREFIX: "Descartar",
  // Se completa con el número de días: "Lo compraste hace 9 días".
  LAST_PURCHASE_DAYS_PREFIX: "Lo compraste hace",
  LAST_PURCHASE_DAYS_SUFFIX: "días",
  LAST_PURCHASE_ONE_DAY: "Lo compraste hace 1 día",
  LAST_PURCHASE_TODAY: "Lo compraste hoy",
  // Nombre de la región y título visible de la fila.
  TITLE: "¿Se te acabó?",
  // Entrada a "Mi inventario" desde la fila (SCRUM-105, HU-71b CA-01).
  VIEW_INVENTORY: "Ver mi inventario",
} as const;

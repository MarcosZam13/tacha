// Constantes de "¿Qué hiciste?" (SCRUM-115): resolver el faltante de receta al
// tachar y deshacerlo al destachar. Reglas en specs/SPEC.md §18.

// Espejo de los valores que acepta resolve_list_item_shortfall (037).
export const SHORTFALL_RESOLUTION = {
  HAD_ENOUGH: "hadEnough",
  OTHER_PRESENTATION: "otherPresentation",
  SAME_AGAIN: "sameAgain",
} as const;

export type ShortfallResolutionType = (typeof SHORTFALL_RESOLUTION)[keyof typeof SHORTFALL_RESOLUTION];

// Estados del panel (SPEC §18.6).
export const SHORTFALL_PANEL_STATUS = {
  CHOOSING: "choosing",
  CHOOSING_PRESENTATION: "choosingPresentation",
  CLOSED: "closed",
  FAILED: "failed",
  LOADING_PRESENTATIONS: "loadingPresentations",
  PRESENTATIONS_FAILED: "presentationsFailed",
  RESOLVING: "resolving",
} as const;

export type ShortfallPanelStatusType = (typeof SHORTFALL_PANEL_STATUS)[keyof typeof SHORTFALL_PANEL_STATUS];

// Acciones del reducer del panel (utils/shortfall-panel.reducer.ts).
export const SHORTFALL_PANEL_ACTION = {
  BACK_TO_CHOICES: "backToChoices",
  CLOSED: "closed",
  OPENED: "opened",
  PRESENTATIONS_FAILED: "presentationsFailed",
  PRESENTATIONS_LOADED: "presentationsLoaded",
  PRESENTATIONS_REQUESTED: "presentationsRequested",
  RESOLVE_FAILED: "resolveFailed",
  RESOLVE_STARTED: "resolveStarted",
  STILL_SHORT: "stillShort",
} as const;

// Estados del diálogo de destachar con deshacer (SPEC §18.6).
export const UNDO_UNCHECK_STATUS = {
  CLOSED: "closed",
  CONFIRMING: "confirming",
  FAILED: "failed",
  REVERTING: "reverting",
} as const;

export type UndoUncheckStatusType = (typeof UNDO_UNCHECK_STATUS)[keyof typeof UNDO_UNCHECK_STATUS];

export const SHORTFALL_PANEL_TEXT = {
  BACK: "Volver",
  HAD_ENOUGH: "Ya tenía suficiente",
  LOADING_PRESENTATIONS: "Cargando presentaciones…",
  NO_OTHER_PRESENTATIONS: "No hay otras presentaciones de este producto.",
  NO_PRICE: "Sin precio de referencia",
  NOT_NOW: "Ahora no",
  OTHER_PRESENTATION: "Cambié a otra presentación",
  PRESENTATIONS_ERROR: "No se pudieron cargar las presentaciones. Intenta de nuevo.",
  // CA-03: el orden se explica para que no parezca una recomendación.
  PRESENTATIONS_ORDER: "Ordenadas por precio aproximado, de menor a mayor.",
  PRESENTATIONS_TITLE: "¿Cuál compraste?",
  // Separa el tamaño del precio en el nombre accesible de cada presentación.
  PRESENTATION_LABEL_SEPARATOR: ", ",
  RESOLVE_ERROR: "No se pudo guardar lo que hiciste. Intenta de nuevo.",
  RETRY: "Reintentar",
  SAME_AGAIN: "Agregué otra igual",
  SAVING: "Guardando…",
  STILL_SHORT: "Todavía falta:",
  TITLE: "¿Qué hiciste?",
} as const;

export const UNDO_UNCHECK_TEXT = {
  CANCEL: "Cancelar",
  CONFIRM: "Destachar y deshacer",
  ERROR: "No se pudo destachar el producto. Intenta de nuevo.",
  MANUAL_CHANGES_LOST: "También se pierde lo que cambiaste a mano después.",
  // "La fila vuelve a 1 × Leche Dos Pinos (1000 ml)."
  QUANTITY_SEPARATOR: " × ",
  RETURNS_TO: "La fila vuelve a",
  REVERTING: "Destachando…",
  TITLE: "¿Destachar y deshacer lo que elegiste?",
} as const;

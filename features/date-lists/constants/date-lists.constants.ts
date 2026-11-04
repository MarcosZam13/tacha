// Constantes de las sublistas por fecha (SCRUM-77, SPEC.md).

// Espejo del check de lists.status (004). "active" se muestra como "Pendiente".
export const DATE_LIST_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type DateListStatusType = (typeof DATE_LIST_STATUS)[keyof typeof DATE_LIST_STATUS];

export const DATE_LIST_STATUS_LABEL: Record<DateListStatusType, string> = {
  [DATE_LIST_STATUS.ACTIVE]: "Pendiente",
  [DATE_LIST_STATUS.CANCELLED]: "Cancelada",
  [DATE_LIST_STATUS.COMPLETED]: "Completada",
};

// Estado de un vistazo (CA-02 de SCRUM-76): color y marca; en la celda además se tacha el nombre
// de la cancelada. No depende solo del color.
export const DATE_LIST_STATUS_STYLE: Record<DateListStatusType, string> = {
  [DATE_LIST_STATUS.ACTIVE]: "border border-tacha-chipborder bg-tacha-chipbg text-tacha-text",
  [DATE_LIST_STATUS.CANCELLED]: "bg-tacha-border text-tacha-text",
  [DATE_LIST_STATUS.COMPLETED]: "bg-tacha-teal text-tacha-surface",
};

// El punto de mobile: el fondo pálido de la etiqueta casi no se ve en un círculo de 8 px.
export const DATE_LIST_STATUS_DOT: Record<DateListStatusType, string> = {
  [DATE_LIST_STATUS.ACTIVE]: "bg-tacha-terracotta",
  [DATE_LIST_STATUS.CANCELLED]: "bg-tacha-textsec",
  [DATE_LIST_STATUS.COMPLETED]: "bg-tacha-teal",
};

export const DATE_LIST_STATUS_MARK: Record<DateListStatusType, string> = {
  [DATE_LIST_STATUS.ACTIVE]: "○",
  [DATE_LIST_STATUS.CANCELLED]: "✕",
  [DATE_LIST_STATUS.COMPLETED]: "✓",
};

export const DATE_CALENDAR = {
  DAYS_IN_WEEK: 7,
  // Con más, la celda crece y descuadra la semana. El resto queda como "+N" y en la agenda.
  MAX_CHIPS_PER_DAY: 2,
  WEEKDAYS: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
} as const;

// Espejo del check lists_date_fields_check (038).
export const DATE_LIST_NAME = {
  MAX_LENGTH: 60,
} as const;

// Formato de lists.event_date: una fecha sin hora, YYYY-MM-DD.
export const EVENT_DATE_FORMAT = {
  LOCALE: "es-CR",
  PATTERN: /^(\d{4})-(\d{2})-(\d{2})$/,
} as const;

export const DATE_LIST_DB = {
  // Solo lo pendiente: tachar llega con SCRUM-78 (SPEC §4).
  DETAIL_SELECT:
    "id, name, event_date, status, list_items(id, quantity_requested, created_at, product_catalog_variants(id, base_unit, base_quantity, product_catalog(name)))",
  LIST_SELECT: "id, name, event_date, status",
  LIST_TYPE: "date",
  RPC: {
    ADD_ITEM: "add_item_to_date_list",
    CREATE: "create_date_list",
  },
  TABLE: {
    LISTS: "lists",
    LIST_ITEMS: "list_items",
  },
} as const;

export const DATE_LIST_TEXT = {
  ADD_ERROR: "No pudimos agregar el producto. Probá de nuevo.",
  BACK: "Volver a Fechas",
  CALENDAR_LABEL: "Calendario de sublistas",
  CREATE_ERROR: "No pudimos crear la sublista. Probá de nuevo.",
  CREATE_ON_DAY: "Crear sublista el",
  CREATE_SUBMIT: "Crear sublista",
  CREATE_SUBMITTING: "Creando…",
  DATE_LABEL: "Fecha",
  DATE_PAST_ERROR: "Elegí hoy o una fecha futura.",
  DATE_REQUIRED_ERROR: "Elegí una fecha.",
  DECREASE_QUANTITY: "Quitar uno",
  DETAIL_EMPTY: "Todavía no tiene productos. Buscá el primero arriba.",
  DETAIL_LOAD_ERROR: "No pudimos cargar la sublista. Probá de nuevo.",
  DETAIL_NOT_FOUND: "No encontramos esta sublista.",
  EMPTY: "Todavía no tenés sublistas. Creá una para un evento o un viaje.",
  FORM_CANCEL: "Cancelar",
  INCREASE_QUANTITY: "Agregar uno",
  LOAD_ERROR: "No pudimos cargar tus sublistas. Probá de nuevo.",
  MONTH_EMPTY: "No hay sublistas este mes.",
  MONTH_LISTS_LABEL: "Sublistas del mes",
  MORE_ON_DAY: "más",
  NAME_LABEL: "Nombre",
  NAME_PLACEHOLDER: "Paseo a la playa",
  NAME_REQUIRED_ERROR: "Escribí un nombre.",
  NAME_TOO_LONG_ERROR: `Máximo ${DATE_LIST_NAME.MAX_LENGTH} caracteres.`,
  NEW: "+ Nueva sublista",
  NEXT_MONTH: "Mes siguiente",
  PREVIOUS_MONTH: "Mes anterior",
  QUANTITY_ERROR: "No pudimos cambiar la cantidad. Probá de nuevo.",
  REMOVE_ERROR: "No pudimos eliminar el producto. Probá de nuevo.",
  REMOVE_ITEM: "Eliminar",
  TITLE: "Fechas",
} as const;

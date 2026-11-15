// Configuración por lista (SCRUM-108 / HU-78): hoy solo el interruptor "Encargado".
export const LIST_SETTINGS_DB = {
  LIST_TYPE: {
    DATE: "date",
    GENERAL: "general",
  },
  RPC: {
    SET_ASSIGNEE_ENABLED: "set_list_assignee_enabled",
  },
  // Las listas que se configuran hoy (SPEC §5, regla 2) con su ajuste embebido: sin fila, apagado.
  SELECT: "id, type, name, event_date, household_id, list_settings(assignee_enabled)",
  TABLE: {
    LISTS: "lists",
  },
} as const;

// Estados de la pantalla (SPEC §6).
export const LIST_SETTINGS_STATUS = {
  EMPTY: "empty",
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

export type ListSettingsStatusType = (typeof LIST_SETTINGS_STATUS)[keyof typeof LIST_SETTINGS_STATUS];

// Qué pasó al guardar el interruptor. El servicio no lanza: devuelve esto y el ViewModel decide qué mostrar.
export const SET_ASSIGNEE_ENABLED_RESULT = {
  ERROR: "error",
  NOT_FOUND: "notFound",
  SAVED: "saved",
} as const;

export type SetAssigneeEnabledResultType =
  (typeof SET_ASSIGNEE_ENABLED_RESULT)[keyof typeof SET_ASSIGNEE_ENABLED_RESULT];

export const SET_ASSIGNEE_ENABLED_RESULT_MESSAGE = {
  [SET_ASSIGNEE_ENABLED_RESULT.ERROR]: "No se pudo guardar el ajuste. Intenta de nuevo.",
  [SET_ASSIGNEE_ENABLED_RESULT.NOT_FOUND]: "Esa lista ya no existe. Tu lista se actualizó.",
} as const;

export const LIST_SETTINGS_TEXT = {
  ASSIGNEE_DESCRIPTION: "Asigna quién debe comprar cada producto. Se activa lista por lista.",
  ASSIGNEE_TITLE: "Encargado",
  BACK_TO_PROFILE: "Volver al perfil",
  EMPTY: "Todavía no tienes listas. Crea una para poder configurarla.",
  GENERAL_LIST: "Lista general",
  GENERAL_LIST_FAMILY: "Lista general de la familia",
  LOAD_ERROR: "No se pudieron cargar tus listas. Intenta de nuevo.",
  RETRY: "Reintentar",
  SUBTITLE: "Ajustes por lista",
  SWITCH_OFF: "Desactivado",
  SWITCH_ON: "Activado",
  SWITCH_SAVING: "Guardando…",
  TITLE: "Configuración",
} as const;

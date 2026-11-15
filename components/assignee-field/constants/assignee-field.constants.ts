// El campo "Encargado" de la fila de una lista (SCRUM-108 / HU-78). Lo usan la lista general y el detalle
// de la sublista por fecha, que no pueden importarse entre sí.
export const ASSIGNEE_DB = {
  RPC: {
    FIND_GENERAL_LIST_ID: "find_general_list_id",
    GET_CANDIDATES: "get_list_assignee_candidates",
    SET_ITEM_ASSIGNEE: "set_list_item_assignee",
  },
  SELECT: {
    ASSIGNMENTS: "id, assigned_to",
    SETTING: "assignee_enabled",
  },
  TABLE: {
    LIST_ITEMS: "list_items",
    LIST_SETTINGS: "list_settings",
  },
} as const;

// De dónde sale la lista: la general de quien llama (la decide la base) o una lista concreta.
export const ASSIGNEE_LIST_SOURCE = {
  GENERAL: "general",
  LIST: "list",
} as const;

export type AssigneeListSourceType = (typeof ASSIGNEE_LIST_SOURCE)[keyof typeof ASSIGNEE_LIST_SOURCE];

// Qué pasó al elegir al encargado. El servicio no lanza: devuelve esto y el ViewModel decide qué mostrar.
export const SET_ITEM_ASSIGNEE_RESULT = {
  ERROR: "error",
  NOT_ALLOWED: "notAllowed",
  NOT_FOUND: "notFound",
  SAVED: "saved",
} as const;

export type SetItemAssigneeResultType = (typeof SET_ITEM_ASSIGNEE_RESULT)[keyof typeof SET_ITEM_ASSIGNEE_RESULT];

export const ASSIGNEE_TEXT = {
  CANCEL: "Cancelar",
  CHANGE: "Cambiar",
  CURRENT_USER_SUFFIX: "(tú)",
  ERROR_NOT_ALLOWED: "Esa persona ya no tiene acceso a la lista. Elige a otra.",
  ERROR_SAVE: "No se pudo asignar al encargado. Intenta de nuevo.",
  FIELD_LABEL: "Encargado",
  LIST_UPDATED: "Tu lista se actualizó.",
  PICKER_TITLE: "Elegir encargado",
  SAVING: "Guardando…",
  UNASSIGNED: "Sin asignar",
  UNNAMED: "Sin nombre",
} as const;

// Valores de lists (004) que comparten las sublistas por fecha (SCRUM-77) y el
// planificador al elegir a qué lista agregar la semana (SCRUM-160).

/** lists.type de una sublista por fecha. */
export const DATE_LIST_TYPE = "date";

// Espejo del check de lists.status. "active" se muestra como "Pendiente".
export const DATE_LIST_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type DateListStatusType = (typeof DATE_LIST_STATUS)[keyof typeof DATE_LIST_STATUS];

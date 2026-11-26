// Constantes de "Mi inventario" (SCRUM-105, HU-71b).

export const MY_INVENTORY_DB = {
  RPC: {
    // Lo que todavía se cree que hay en casa (migración 065).
    GET_MY_INVENTORY: "get_my_inventory",
  },
} as const;

// Estados de la pantalla.
export const MY_INVENTORY_STATUS = {
  EMPTY: "empty",
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

export type MyInventoryStatusType = (typeof MY_INVENTORY_STATUS)[keyof typeof MY_INVENTORY_STATUS];

// Grupos por urgencia (CA-01). "Más adelante" lo decidió el equipo el
// 2026-11-25: lo que dura más de 30 días no cabe en los otros tres.
export const INVENTORY_GROUP = {
  LATER: "later",
  NO_DATE: "noDate",
  SOON: "soon",
  THIS_MONTH: "thisMonth",
} as const;

export type InventoryGroupType = (typeof INVENTORY_GROUP)[keyof typeof INVENTORY_GROUP];

// El orden de los grupos en pantalla: de lo más urgente a lo que no tiene fecha.
export const INVENTORY_GROUP_ORDER: readonly InventoryGroupType[] = [
  INVENTORY_GROUP.SOON,
  INVENTORY_GROUP.THIS_MONTH,
  INVENTORY_GROUP.LATER,
  INVENTORY_GROUP.NO_DATE,
];

export const INVENTORY_GROUP_TITLE = {
  [INVENTORY_GROUP.LATER]: "Más adelante",
  [INVENTORY_GROUP.NO_DATE]: "Sin fecha estimada",
  [INVENTORY_GROUP.SOON]: "Vence pronto",
  [INVENTORY_GROUP.THIS_MONTH]: "Este mes",
} as const satisfies Record<InventoryGroupType, string>;

// Cortes en días que quedan (confirmados con el equipo el 2026-11-25):
// hasta 7 "Vence pronto"; de 8 a 30 "Este mes"; más de 30 "Más adelante".
export const INVENTORY_DAYS_LIMIT = {
  SOON_MAX: 7,
  THIS_MONTH_MAX: 30,
} as const;

export const MY_INVENTORY_TEXT = {
  BACK_TO_LIST: "← Volver a la lista",
  // CA-04: sin pedir que se llene a mano.
  EMPTY: "Todavía no hay nada en tu inventario. Se llena solo cuando tachas productos al comprar.",
  ERROR: "No se pudo cargar tu inventario. Intenta de nuevo.",
  LOADING: "Cargando tu inventario",
  // "Te quedan 5 días" (CA-02).
  REMAINING_DAYS_PREFIX: "Te quedan",
  REMAINING_DAYS_SUFFIX: "días",
  REMAINING_ONE_DAY: "Te queda 1 día",
  REMAINING_TODAY: "Se acaba hoy",
  RETRY: "Reintentar",
  TITLE: "Mi inventario",
} as const;

// Constantes de la pantalla "Mis grupos" (SCRUM-109 / HU-72).

// Tablas y columnas de la lectura (services/product-groups.service.ts).
// Misma razón que MY_PRODUCTS_DB para tenerlas sueltas: el genérico de la
// Database solo valida .select(), no .order().
export const PRODUCT_GROUPS_DB = {
  COLUMN: {
    UPDATED_AT: "updated_at",
  },
  // Crear un grupo con sus productos (SCRUM-110, migración 056).
  RPC: {
    CREATE_PRODUCT_GROUP: "create_product_group",
  },
  // Cada grupo con el conteo de sus items (count embebido de PostgREST,
  // pasa por la RLS de product_group_items).
  SELECT: "id, name, household_id, updated_at, product_group_items(count)",
  TABLE: {
    PRODUCT_GROUPS: "product_groups",
  },
} as const;

// Se busca sola al montar, sin "idle" (igual que MY_PRODUCTS_STATUS).
export const PRODUCT_GROUPS_STATUS = {
  EMPTY: "empty",
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

export type ProductGroupsStatusType = (typeof PRODUCT_GROUPS_STATUS)[keyof typeof PRODUCT_GROUPS_STATUS];

// Singular y plural del conteo de la tarjeta: "1 producto" / "8 productos".
export const PRODUCT_GROUP_COUNT_LABEL = {
  PLURAL: "productos",
  SINGULAR: "producto",
} as const;

export const PRODUCT_GROUPS_TEXT = {
  BACK_TO_LIST: "Volver a la lista",
  // SCRUM-110: en la cabecera y en el estado vacío.
  CREATE_FIRST_GROUP: "Crear tu primer grupo",
  CREATE_GROUP: "+ Crear grupo",
  // Texto literal del CA-02 de HU-72.
  EMPTY_SUGGESTION: "Agrupá los productos que siempre comprás juntos",
  ERROR: "No pudimos cargar tus grupos. Intenta de nuevo.",
  LOADING: "Cargando tus grupos",
  RETRY: "Reintentar",
  SHARED_BADGE: "Compartido",
  TITLE: "Mis grupos",
} as const;

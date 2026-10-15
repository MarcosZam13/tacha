// Constantes propias de la pantalla "Mis productos" (SCRUM-86 / HU-55). El
// título de la sección ya es compartido: CATALOG_TABS_TEXT.SECTION_TITLE en
// constants/catalog-tabs.constants.ts.

// Tablas y columnas usadas en la consulta (services/my-products.service.ts).
// No se usa la Database generada para estos nombres sueltos porque el
// genérico solo valida .select(), no .eq()/.order().
export const MY_PRODUCTS_DB = {
  COLUMN: {
    HOUSEHOLD_ID: "household_id",
    NAME: "name",
    SOURCE: "source",
    USER_ID: "user_id",
  },
  // Una fila de product_catalog con sus variantes embebidas.
  SELECT: "id, name, product_catalog_variants(id, base_unit, base_quantity, image_url)",
  TABLE: {
    HOUSEHOLD_MEMBERS: "household_members",
    PRODUCT_CATALOG: "product_catalog",
  },
} as const;

// Misma unión que CATALOG_SEARCH_STATUS, sin "idle": esta pantalla busca sola
// al montar, no espera que el usuario escriba nada (SPEC.md §6).
export const MY_PRODUCTS_STATUS = {
  EMPTY: "empty",
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

export type MyProductsStatusType = (typeof MY_PRODUCTS_STATUS)[keyof typeof MY_PRODUCTS_STATUS];

export const MY_PRODUCTS_TEXT = {
  BADGE_LABEL: "Agregado por mí",
  EMPTY_SUGGESTION: "Agregá productos que no encontrás en el catálogo",
  ERROR: "No pudimos cargar tus productos. Intenta de nuevo.",
  LOADING: "Cargando…",
} as const;

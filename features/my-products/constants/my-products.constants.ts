// Constantes propias de la pantalla "Mis productos" (SCRUM-86 / HU-55). El
// título de la sección ya es compartido: CATALOG_TABS_TEXT.SECTION_TITLE en
// constants/catalog-tabs.constants.ts.

// Tablas y columnas usadas en la consulta (services/my-products.service.ts).
// No se usa la Database generada para estos nombres sueltos porque el
// genérico solo valida .select(), no .eq()/.order().
export const MY_PRODUCTS_DB = {
  COLUMN: {
    // HU-58 (SCRUM-89, migración 052): un producto eliminado pero en uso queda archivado.
    ARCHIVED_AT: "archived_at",
    HOUSEHOLD_ID: "household_id",
    NAME: "name",
    // Agregado en HU-56 (SCRUM-87, migración 031): filtra los productos
    // personales que no se compartieron con ningún household.
    OWNER_ID: "owner_id",
    SOURCE: "source",
    USER_ID: "user_id",
  },
  // Una fila de product_catalog con sus variantes embebidas. HU-57 (SCRUM-88,
  // migración 051): precio y tienda de referencia; stores(display_name) es el
  // nombre del súper cuando se eligió uno de los 3 (reference_store_id).
  // HU-58: también la categoría, la marca y el slug del súper, para abrir el
  // formulario de edición precargado.
  SELECT:
    "id, name, category_id, product_catalog_variants(id, base_unit, base_quantity, image_url, reference_price, reference_store_name, stores(display_name, slug), product_brands(name))",
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

// HU-58 (SCRUM-89): estados de eliminar un producto (MyProductDeletionState
// en models/my-product-deletion.types.ts), mismo patrón que recetas.
export const MY_PRODUCT_DELETION_STATUS = {
  CONFIRMING: "confirming",
  DELETING: "deleting",
  FAILED: "failed",
  IDLE: "idle",
} as const;

// HU-58: botones de cada tarjeta y diálogo de eliminar. TRIGGER abre el
// diálogo; CONFIRM es el del diálogo que de verdad elimina.
export const MY_PRODUCT_ACTION_TEXT = {
  EDIT: "Editar",
  TRIGGER_DELETE: "Eliminar",
} as const;

export const MY_PRODUCT_DELETE_TEXT = {
  CANCEL: "Cancelar",
  CONFIRM: "Eliminar",
  DELETING: "Eliminando…",
  DIALOG_TITLE: "¿Eliminar este producto?",
  ERROR: "No se pudo eliminar el producto. Intenta de nuevo.",
  IRREVERSIBLE_NOTICE: "Deja de aparecer en \"Mis productos\" y no se puede deshacer.",
  // Aviso de CA-02: "Está en 2 listas activas y 1 receta; ahí lo vas a seguir
  // viendo." Las piezas se arman en utils/toUsageNoticeText.ts.
  USAGE_AND: "y",
  // SCRUM-110: un producto en un grupo también está en uso.
  USAGE_GROUP_PLURAL: "grupos",
  USAGE_GROUP_SINGULAR: "grupo",
  USAGE_LIST_SEPARATOR: ",",
  USAGE_LIST_PLURAL: "listas activas",
  USAGE_LIST_SINGULAR: "lista activa",
  USAGE_PREFIX: "Está en",
  USAGE_RECIPE_PLURAL: "recetas",
  USAGE_RECIPE_SINGULAR: "receta",
  USAGE_SUFFIX: "; ahí lo vas a seguir viendo.",
} as const;

export const MY_PRODUCTS_TEXT = {
  BADGE_LABEL: "Agregado por mí",
  EMPTY_SUGGESTION: "Agrega productos que no encuentras en el catálogo",
  ERROR: "No pudimos cargar tus productos. Intenta de nuevo.",
  LOADING: "Cargando…",
} as const;

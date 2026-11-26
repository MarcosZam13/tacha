import { CATALOG_BASE_UNIT } from "@/constants/catalog.constants";
import type { CatalogBaseUnitType } from "@/constants/catalog.constants";
import { STORE_DISPLAY, STORE_NAMES } from "@/constants/stores.constants";
import type { StoreSlug } from "@/constants/stores.constants";

// Constantes del formulario "Agregar producto personalizado" (SCRUM-87 / HU-56),
// compartido entre "Mis productos" y el enlace de CA-04 en features/catalog/
// (ver specs/plan.md de features/my-products/). Las categorías del select NO
// tienen tabla/columna propia aquí: se leen con getCategories(), ya existente
// en services/catalog.service.ts (ver plan.md, "Desviación de este plan").

// Tabla y columna de la consulta propia de hasHousehold()
// (services/personal-product.service.ts) y el RPC de guardar.
export const PERSONAL_PRODUCT_DB = {
  COLUMN: {
    USER_ID: "user_id",
  },
  RPC: {
    CREATE_PERSONAL_PRODUCT: "create_personal_product",
    // HU-58 (SCRUM-89, migración 052).
    DELETE_PERSONAL_PRODUCT: "delete_personal_product",
    GET_PERSONAL_PRODUCT_USAGE: "get_personal_product_usage",
    UPDATE_PERSONAL_PRODUCT: "update_personal_product",
  },
  TABLE: {
    HOUSEHOLD_MEMBERS: "household_members",
  },
} as const;

// HU-58 (SCRUM-89): lo que devuelve delete_personal_product (migración 052).
// "deleted": nada lo usaba y se borró; "archived": lo usa alguna lista o
// receta, así que se ocultó de "Mis productos" sin borrarlo.
export const PERSONAL_PRODUCT_DELETE_RESULT = {
  ARCHIVED: "archived",
  DELETED: "deleted",
} as const;

export type PersonalProductDeleteResultType =
  (typeof PERSONAL_PRODUCT_DELETE_RESULT)[keyof typeof PERSONAL_PRODUCT_DELETE_RESULT];

// Estados del formulario (SPEC.md §6): idle (cerrado), open (abierto, sin
// enviar), submitting, error (el formulario sigue abierto con los datos ya
// escritos). "success" no es un estado visible: cierra el formulario de
// inmediato (useCreateProductForm vuelve directo a idle).
export const CREATE_PRODUCT_FORM_STATUS = {
  ERROR: "error",
  IDLE: "idle",
  OPEN: "open",
  SUBMITTING: "submitting",
} as const;

export type CreateProductFormStatusType = (typeof CREATE_PRODUCT_FORM_STATUS)[keyof typeof CREATE_PRODUCT_FORM_STATUS];

// Opciones del selector de unidad del tamaño base. Mismo contenido y mismo
// orden que RECIPE_UNIT_OPTIONS (features/recipes/constants/recipes.constants.ts)
// pero sin importar entre features: este formulario es compartido (plan.md),
// nace en components/create-product-form/, no dentro de recetas.
export const CREATE_PRODUCT_FORM_UNIT_LABEL = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "unidad",
} as const satisfies Record<CatalogBaseUnitType, string>;

export const CREATE_PRODUCT_FORM_UNIT_OPTIONS = [
  { label: CREATE_PRODUCT_FORM_UNIT_LABEL[CATALOG_BASE_UNIT.MILLILITERS], value: CATALOG_BASE_UNIT.MILLILITERS },
  { label: CREATE_PRODUCT_FORM_UNIT_LABEL[CATALOG_BASE_UNIT.GRAMS], value: CATALOG_BASE_UNIT.GRAMS },
  { label: CREATE_PRODUCT_FORM_UNIT_LABEL[CATALOG_BASE_UNIT.UNIT], value: CATALOG_BASE_UNIT.UNIT },
] as const satisfies ReadonlyArray<{ label: string; value: CatalogBaseUnitType }>;

// HU-57 (SCRUM-88): tienda de referencia. Espejo del check
// product_catalog_variants_reference_store_name_length (migración 051).
export const REFERENCE_STORE_NAME_MAX_LENGTH = 80;

// HU-57: espejo de reference_price_limit (migración 051). La columna es
// numeric(12,2): 10 dígitos enteros, así que 10^10 ya no entra.
export const REFERENCE_PRICE_LIMIT = 10_000_000_000;

// HU-57: la columna guarda 2 decimales; el precio se valida en céntimos.
export const CENTS_PER_COLON = 100;
export const REFERENCE_PRICE_LIMIT_CENTS = REFERENCE_PRICE_LIMIT * CENTS_PER_COLON;

// HU-57: lo que se acepta como precio: dígitos con hasta un separador
// decimal, punto o coma (en Costa Rica se escribe "2850,50"). Deja afuera lo
// que Number() aceptaría sin que sea un precio: "1e3", "0x10", " - ".
export const REFERENCE_PRICE_PATTERN = /^\d+([.,]\d+)?$/;

// Errores de validación en el cliente (CA-02): se muestran inline y nunca
// llegan a llamar al RPC si hay alguno. El servidor valida lo mismo de nuevo
// (SPEC.md §5), esto es solo para no hacer un viaje de red de más.
export const CREATE_PRODUCT_FORM_ERROR = {
  CATEGORY_REQUIRED: "Selecciona una categoría.",
  NAME_REQUIRED: "Escribe un nombre.",
  PRICE_INVALID: "Escribe un precio mayor a 0.",
  PRICE_TOO_HIGH: "El precio es demasiado alto.",
  QUANTITY_REQUIRED: "Escribe una cantidad mayor a 0.",
  STORE_NAME_REQUIRED: "Escribe el nombre de la tienda.",
  STORE_NAME_TOO_LONG: `El nombre de la tienda puede tener hasta ${REFERENCE_STORE_NAME_MAX_LENGTH} caracteres.`,
} as const;

// Las dos opciones del selector de tienda que no son un supermercado: "sin
// tienda" (valor vacío, mismo criterio que el placeholder de categoría) y
// "otra tienda" (abre el campo de texto libre). El resto de las opciones son
// los slugs de STORE_NAMES, que la base traduce al id de `stores`.
export const REFERENCE_STORE_CHOICE = {
  CUSTOM: "otra",
  NONE: "",
} as const;

export type ReferenceStoreChoiceType =
  | (typeof REFERENCE_STORE_CHOICE)[keyof typeof REFERENCE_STORE_CHOICE]
  | StoreSlug;

// Orden alfabético por nombre visible.
export const REFERENCE_STORE_SUPERMARKET_OPTIONS = [
  { label: STORE_DISPLAY[STORE_NAMES.MASXMENOS], value: STORE_NAMES.MASXMENOS },
  { label: STORE_DISPLAY[STORE_NAMES.MAXIPALI], value: STORE_NAMES.MAXIPALI },
  { label: STORE_DISPLAY[STORE_NAMES.WALMART], value: STORE_NAMES.WALMART },
] as const satisfies ReadonlyArray<{ label: string; value: StoreSlug }>;

export const CREATE_PRODUCT_FORM_TEXT = {
  BRAND_LABEL: "Marca (opcional)",
  CANCEL: "Cancelar",
  CATEGORIES_ERROR: "No pudimos cargar las categorías. Intenta de nuevo.",
  CATEGORY_LABEL: "Categoría",
  CATEGORY_PLACEHOLDER: "Selecciona una categoría",
  // HU-58 (SCRUM-89): mismo formulario en modo edición.
  EDIT_TITLE: "Editar producto",
  NAME_LABEL: "Nombre del producto",
  OPEN_BUTTON: "+ Agregar producto",
  PRICE_LABEL: "Precio de referencia (opcional)",
  QUANTITY_LABEL: "Cantidad",
  SAVE: "Guardar",
  SAVING: "Guardando…",
  SHARE_LABEL: "Compartir con mi familia",
  STORE_CUSTOM_OPTION: "Otra tienda",
  STORE_LABEL: "Tienda (opcional)",
  STORE_NAME_LABEL: "Nombre de la tienda",
  STORE_NONE_OPTION: "Sin tienda",
  // Nunca se muestra error.message de la base (mismo criterio que
  // useHouseholdViewModel.submitHousehold): un mensaje fijo, nunca el crudo
  // del servidor.
  SUBMIT_ERROR: "No pudimos guardar el producto. Intenta de nuevo.",
  TITLE: "Agregar producto",
  UNIT_LABEL: "Unidad",
} as const;

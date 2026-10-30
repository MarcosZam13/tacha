import { CATALOG_BASE_UNIT } from "@/constants/catalog.constants";
import type { CatalogBaseUnitType } from "@/constants/catalog.constants";

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
  },
  TABLE: {
    HOUSEHOLD_MEMBERS: "household_members",
  },
} as const;

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

// Errores de validación en el cliente (CA-02): se muestran inline y nunca
// llegan a llamar al RPC si hay alguno. El servidor valida lo mismo de nuevo
// (SPEC.md §5), esto es solo para no hacer un viaje de red de más.
export const CREATE_PRODUCT_FORM_ERROR = {
  CATEGORY_REQUIRED: "Selecciona una categoría.",
  NAME_REQUIRED: "Escribe un nombre.",
  QUANTITY_REQUIRED: "Escribe una cantidad mayor a 0.",
} as const;

export const CREATE_PRODUCT_FORM_TEXT = {
  BRAND_LABEL: "Marca (opcional)",
  CANCEL: "Cancelar",
  CATEGORIES_ERROR: "No pudimos cargar las categorías. Intenta de nuevo.",
  CATEGORY_LABEL: "Categoría",
  CATEGORY_PLACEHOLDER: "Selecciona una categoría",
  NAME_LABEL: "Nombre del producto",
  OPEN_BUTTON: "+ Agregar producto",
  QUANTITY_LABEL: "Cantidad",
  SAVE: "Guardar",
  SAVING: "Guardando…",
  SHARE_LABEL: "Compartir con mi household",
  // Nunca se muestra error.message de la base (mismo criterio que
  // useHouseholdViewModel.submitHousehold): un mensaje fijo, nunca el crudo
  // del servidor.
  SUBMIT_ERROR: "No pudimos guardar el producto. Intenta de nuevo.",
  TITLE: "Agregar producto",
  UNIT_LABEL: "Unidad",
} as const;

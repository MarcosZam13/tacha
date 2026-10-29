import { CATALOG_BASE_UNIT } from "./catalog.constants";
import type { CatalogBaseUnitType } from "./catalog.constants";

// Cómo se escribe una cantidad de receta (utils/formatRecipeQuantity.ts).
// Promovidas desde features/recipes/ (SCRUM-114): la lista general también
// escribe faltantes de receta ("+ 600 ml necesarios para Tres leches").

// En Costa Rica los decimales se escriben con coma; Number() solo entiende punto.
export const DECIMAL_SEPARATOR = {
  COMMA: ",",
  POINT: ".",
} as const;

// Cómo se muestra cada unidad en el selector del ingrediente.
export const RECIPE_UNIT_LABEL = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "unidades",
} as const satisfies Record<CatalogBaseUnitType, string>;

// Singular de cada unidad, para cantidades de exactamente 1 ("1 unidad", no "1 unidades").
export const RECIPE_UNIT_SINGULAR_LABEL = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "unidad",
} as const satisfies Record<CatalogBaseUnitType, string>;

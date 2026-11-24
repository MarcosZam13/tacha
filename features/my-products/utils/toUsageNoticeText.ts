import type { PersonalProductUsage } from "@/services/personal-product.service";
import type { NullableRef } from "@/types/nullable.types";
import { MY_PRODUCT_DELETE_TEXT } from "../constants/my-products.constants";

const toCountText = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

// "a", "a y b", "a, b y c".
const joinParts = (parts: string[]): string => {
  if (parts.length === 1) return parts[0];

  const lastPart = parts[parts.length - 1];
  const firstParts = parts.slice(0, -1).join(`${MY_PRODUCT_DELETE_TEXT.USAGE_LIST_SEPARATOR} `);
  return `${firstParts} ${MY_PRODUCT_DELETE_TEXT.USAGE_AND} ${lastPart}`;
};

/**
 * Aviso de HU-58 CA-02 para el diálogo de eliminar: dónde se usa el producto.
 * "Está en 2 listas activas, 1 receta y 3 grupos; ahí lo vas a seguir viendo."
 * Los grupos se suman con SCRUM-110 (CA-02 de HU-58: "lista, grupo o receta").
 * null si no se usa en ninguna (sin aviso) o si todavía no se sabe (usage null).
 */
export const toUsageNoticeText = (usage: NullableRef<PersonalProductUsage>): NullableRef<string> => {
  if (usage === null) return null;

  const parts = [
    usage.activeListCount > 0
      ? toCountText(usage.activeListCount, MY_PRODUCT_DELETE_TEXT.USAGE_LIST_SINGULAR, MY_PRODUCT_DELETE_TEXT.USAGE_LIST_PLURAL)
      : null,
    usage.recipeCount > 0
      ? toCountText(usage.recipeCount, MY_PRODUCT_DELETE_TEXT.USAGE_RECIPE_SINGULAR, MY_PRODUCT_DELETE_TEXT.USAGE_RECIPE_PLURAL)
      : null,
    usage.groupCount > 0
      ? toCountText(usage.groupCount, MY_PRODUCT_DELETE_TEXT.USAGE_GROUP_SINGULAR, MY_PRODUCT_DELETE_TEXT.USAGE_GROUP_PLURAL)
      : null,
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return null;

  return `${MY_PRODUCT_DELETE_TEXT.USAGE_PREFIX} ${joinParts(parts)}${MY_PRODUCT_DELETE_TEXT.USAGE_SUFFIX}`;
};

import type { PersonalProductUsage } from "@/services/personal-product.service";
import type { NullableRef } from "@/types/nullable.types";
import { MY_PRODUCT_DELETE_TEXT } from "../constants/my-products.constants";

const toCountText = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * Aviso de HU-58 CA-02 para el diálogo de eliminar: dónde se usa el producto.
 * "Está en 2 listas activas y 1 receta; ahí lo vas a seguir viendo."
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
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return null;

  return `${MY_PRODUCT_DELETE_TEXT.USAGE_PREFIX} ${parts.join(` ${MY_PRODUCT_DELETE_TEXT.USAGE_AND} `)}${MY_PRODUCT_DELETE_TEXT.USAGE_SUFFIX}`;
};

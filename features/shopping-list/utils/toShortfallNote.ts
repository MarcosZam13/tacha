import { formatRecipeQuantity } from "@/utils/formatRecipeQuantity";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { RecipeShortfall } from "../models/RecipeShortfall.interface";

/** Un aviso → "+ 600 ml necesarios para Tres leches" (HU-76 CA-01), con coma decimal como en recetas. */
export const toShortfallNote = (shortfall: RecipeShortfall): string =>
  `${SHOPPING_LIST_TEXT.SHORTFALL_NOTE_PREFIX} ${formatRecipeQuantity(shortfall.quantityMissing, shortfall.unit)} ${SHOPPING_LIST_TEXT.SHORTFALL_NOTE_FOR} ${shortfall.recipeName}`;

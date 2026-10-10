import { MULTIPLIER_FORMAT, SERVINGS_MULTIPLIER } from "../constants/meal-planner.constants";
import type { NullableRef } from "@/types/nullable.types";

/**
 * 2 → "×2"; 0.5 → "×0,5". Coma decimal porque así se escribe en Costa Rica
 * (igual que las cantidades de las recetas).
 */
export const formatMultiplier = (multiplier: number): string =>
  `${MULTIPLIER_FORMAT.PREFIX}${String(multiplier).replace(MULTIPLIER_FORMAT.DECIMAL_POINT, MULTIPLIER_FORMAT.DECIMAL_COMMA)}`;

/**
 * El chip de la grilla: "×2", o null si el multiplicador es ×1, que no se
 * muestra (SPEC regla 18).
 */
export const toMultiplierLabel = (multiplier: number): NullableRef<string> =>
  multiplier === SERVINGS_MULTIPLIER.DEFAULT ? null : formatMultiplier(multiplier);

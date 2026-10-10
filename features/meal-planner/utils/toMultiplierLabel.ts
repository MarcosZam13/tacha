import type { NullableRef } from "@/types/nullable.types";
import { SERVINGS_MULTIPLIER } from "../constants/meal-planner.constants";
import { formatMultiplier } from "./formatMultiplier";

/**
 * El chip de la grilla: "×2", o null si el multiplicador es ×1, que no se
 * muestra (SPEC regla 18).
 */
export const toMultiplierLabel = (multiplier: number): NullableRef<string> =>
  multiplier === SERVINGS_MULTIPLIER.DEFAULT ? null : formatMultiplier(multiplier);

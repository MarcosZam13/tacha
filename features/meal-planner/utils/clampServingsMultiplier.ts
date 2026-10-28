import { SERVINGS_MULTIPLIER } from "../constants/meal-planner.constants";

/** Deja el multiplicador dentro de ×0,5 a ×4 (SPEC regla 15). */
export const clampServingsMultiplier = (multiplier: number): number =>
  Math.min(SERVINGS_MULTIPLIER.MAX, Math.max(SERVINGS_MULTIPLIER.MIN, multiplier));

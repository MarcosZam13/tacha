import type { NullableRef } from "@/types/nullable.types";
import { RECIPE_SHARING_HINT } from "../constants/recipes.constants";

/**
 * Los productos personales que save_recipe rechazó en una receta de la familia
 * (060: los nombres van en `details` como JSON), o null si el error es otro.
 */
export const toPersonalProductNames = (error: unknown): NullableRef<string[]> => {
  if (typeof error !== "object" || error === null) return null;
  if (!("hint" in error) || error.hint !== RECIPE_SHARING_HINT.PERSONAL_PRODUCTS) return null;
  if (!("details" in error) || typeof error.details !== "string") return null;

  try {
    const names: unknown = JSON.parse(error.details);
    return Array.isArray(names) ? names.map(String) : null;
  } catch {
    return null;
  }
};

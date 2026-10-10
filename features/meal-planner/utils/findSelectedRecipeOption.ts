import type { NullableRef } from "@/types/nullable.types";
import type { RecipeOption } from "../models/meal-plan.interfaces";

/**
 * La receta elegida en el diálogo, solo si sigue entre las opciones. Si se
 * borró en otra pestaña, devuelve null y "Guardar" se deshabilita hasta elegir
 * otra. Con la lista vacía (todavía sin cargar o sin recetas) tampoco hay nada.
 */
export const findSelectedRecipeOption = (
  recipeId: NullableRef<string>,
  options: RecipeOption[],
): NullableRef<RecipeOption> => {
  if (!recipeId) return null;
  return options.find((option) => option.id === recipeId) ?? null;
};

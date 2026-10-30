import type { RecipeShortfall } from "../models/RecipeShortfall.interface";

/**
 * Los avisos de faltante de dos filas que la base juntó en una (SCRUM-156).
 * Hace lo mismo que la base con los pedidos de receta: los de la misma receta
 * y unidad se suman en una sola línea, el resto se agrega al final. Conserva
 * el orden de la fila que queda.
 */
export const mergeRecipeShortfalls = (
  keptShortfalls: RecipeShortfall[],
  movedShortfalls: RecipeShortfall[],
): RecipeShortfall[] => {
  const merged = keptShortfalls.map((shortfall) => ({ ...shortfall }));

  for (const moved of movedShortfalls) {
    const sameRecipe = merged.find(
      (shortfall) => shortfall.recipeName === moved.recipeName && shortfall.unit === moved.unit,
    );
    if (sameRecipe) sameRecipe.quantityMissing += moved.quantityMissing;
    else merged.push({ ...moved });
  }

  return merged;
};

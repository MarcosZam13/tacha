import { RECIPE_ADDED_STORAGE } from "../constants/recipes.constants";

/**
 * Recetas ya agregadas a la lista desde este navegador (regla 27 de la SPEC).
 * Es una comodidad para pedir confirmación antes de repetir, no una regla del
 * negocio: si el navegador bloquea el almacenamiento (modo privado, datos del
 * sitio borrados), todo sigue funcionando y simplemente no se pregunta.
 */

const readAddedRecipeIds = (): string[] => {
  try {
    const storedValue = window.localStorage.getItem(RECIPE_ADDED_STORAGE.KEY);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];
    // Lo que hay en localStorage lo puede haber escrito cualquiera: se usa solo si es una lista de ids.
    return Array.isArray(parsedValue) ? parsedValue.filter((value) => typeof value === "string") : [];
  } catch {
    // Almacenamiento bloqueado o con basura: se trata como "nunca agregada".
    return [];
  }
};

/** true si la receta ya se agregó antes desde este navegador. */
export const hasAddedRecipe = (recipeId: string): boolean => readAddedRecipeIds().includes(recipeId);

/** Recuerda que la receta se agregó. Si no se puede guardar, no pasa nada: la próxima vez no se pregunta. */
export const rememberAddedRecipe = (recipeId: string): void => {
  const addedRecipeIds = readAddedRecipeIds();
  if (addedRecipeIds.includes(recipeId)) return;

  try {
    window.localStorage.setItem(RECIPE_ADDED_STORAGE.KEY, JSON.stringify([...addedRecipeIds, recipeId]));
  } catch {
    // Almacenamiento lleno o bloqueado: agregar a la lista ya funcionó, solo se pierde la confirmación.
  }
};

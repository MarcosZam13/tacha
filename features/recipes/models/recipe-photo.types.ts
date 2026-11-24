import type { RECIPE_PHOTO_CHANGE } from "../constants/recipes.constants";

// Types de la foto de una receta (SCRUM-161). Las interfaces están en
// recipe-photo.interfaces.ts.

/** Qué pasa con la foto al guardar: no se puede "quitar" y "reemplazar" a la vez. */
export type RecipePhotoChange =
  | { kind: typeof RECIPE_PHOTO_CHANGE.KEEP }
  | { kind: typeof RECIPE_PHOTO_CHANGE.REMOVE }
  | { kind: typeof RECIPE_PHOTO_CHANGE.REPLACE; file: File };

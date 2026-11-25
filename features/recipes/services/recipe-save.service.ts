import {
  RECIPE_PHOTO_CHANGE,
  SAVE_RECIPE_OUTCOME,
  SAVE_RECIPE_PHOTO_RESULT,
  SHARE_RECIPE_RESULT,
} from "../constants/recipes.constants";
import type { SaveRecipePayload, SaveRecipeWithExtrasPayload } from "../models/recipe-editor.interfaces";
import type { SaveRecipeOutcome } from "../models/recipe-editor.types";
import type { RecipePhotoChange } from "../models/recipe-photo.types";
import { toPersonalProductNames } from "../utils/toPersonalProductNames";
import { cleanSavedRecipePhoto, saveRecipePhoto } from "./recipe-photos.service";
import { shareRecipe } from "./recipe-sharing.service";
import { saveRecipe } from "./recipes.service";

// El id de la receta guardada, o cómo terminó si no se guardó.
const saveOnlyRecipe = async (recipe: SaveRecipePayload): Promise<string | SaveRecipeOutcome> => {
  try {
    const savedRecipe = await saveRecipe(recipe);
    return savedRecipe?.recipeId ?? { kind: SAVE_RECIPE_OUTCOME.NOT_FOUND };
  } catch (error) {
    const productNames = toPersonalProductNames(error);
    return productNames
      ? { kind: SAVE_RECIPE_OUTCOME.PERSONAL_PRODUCTS, productNames }
      : { kind: SAVE_RECIPE_OUTCOME.SAVE_FAILED };
  }
};

const shareSavedRecipe = async (recipeId: string, photoChange: RecipePhotoChange): Promise<SaveRecipeOutcome> => {
  // Una foto recién subida ya está limpia; la que se conserva puede ser anterior.
  if (photoChange.kind === RECIPE_PHOTO_CHANGE.KEEP && !(await cleanSavedRecipePhoto(recipeId))) {
    return { kind: SAVE_RECIPE_OUTCOME.SHARE_FAILED, recipeId };
  }

  const result = await shareRecipe(recipeId);
  switch (result.kind) {
    case SHARE_RECIPE_RESULT.SHARED:
      return { kind: SAVE_RECIPE_OUTCOME.SAVED };
    case SHARE_RECIPE_RESULT.PERSONAL_PRODUCTS:
      return { kind: SAVE_RECIPE_OUTCOME.PERSONAL_PRODUCTS, productNames: result.productNames, recipeId };
    case SHARE_RECIPE_RESULT.NO_HOUSEHOLD:
      return { kind: SAVE_RECIPE_OUTCOME.NO_HOUSEHOLD, recipeId };
    case SHARE_RECIPE_RESULT.HOUSEHOLD_LIMIT:
      return { kind: SAVE_RECIPE_OUTCOME.HOUSEHOLD_LIMIT, recipeId };
    case SHARE_RECIPE_RESULT.NOT_FOUND:
      return { kind: SAVE_RECIPE_OUTCOME.NOT_FOUND };
    default:
      return { kind: SAVE_RECIPE_OUTCOME.SHARE_FAILED, recipeId };
  }
};

/**
 * Guardado completo, en orden: receta, foto y compartir (SPEC regla 55). Si uno
 * falla no sigue, y todos se pueden repetir. No lanza: devuelve cómo terminó.
 */
export const saveRecipeWithExtras = async ({
  photoChange,
  recipe,
  shouldShare,
}: SaveRecipeWithExtrasPayload): Promise<SaveRecipeOutcome> => {
  const recipeId = await saveOnlyRecipe(recipe);
  if (typeof recipeId !== "string") return recipeId;

  const photoResult = await saveRecipePhoto({ change: photoChange, recipeId });
  if (photoResult === SAVE_RECIPE_PHOTO_RESULT.NOT_FOUND) return { kind: SAVE_RECIPE_OUTCOME.NOT_FOUND };
  if (photoResult === SAVE_RECIPE_PHOTO_RESULT.FAILED) return { kind: SAVE_RECIPE_OUTCOME.PHOTO_FAILED, recipeId };

  return shouldShare ? shareSavedRecipe(recipeId, photoChange) : { kind: SAVE_RECIPE_OUTCOME.SAVED };
};

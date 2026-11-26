import {
  RECIPE_ADD_TO_LIST_TEXT,
  RECIPE_AUDIENCE_TEXT,
  RECIPE_EDITOR_TEXT,
  RECIPE_PHOTO_TEXT,
  SAVE_RECIPE_OUTCOME,
} from "../constants/recipes.constants";
import type { SaveRecipeOutcome } from "../models/recipe-editor.types";

/** El aviso del editor según cómo terminó el guardado (SPEC 16.6 y 17.6). */
export const toSaveOutcomeMessage = (outcome: SaveRecipeOutcome): string => {
  switch (outcome.kind) {
    case SAVE_RECIPE_OUTCOME.PERSONAL_PRODUCTS:
      return `${RECIPE_AUDIENCE_TEXT.PERSONAL_PRODUCTS_PREFIX} ${outcome.productNames.join(RECIPE_ADD_TO_LIST_TEXT.SUMMARY_SEPARATOR)}.`;
    case SAVE_RECIPE_OUTCOME.PHOTO_FAILED:
      return RECIPE_PHOTO_TEXT.SAVE_FAILED;
    case SAVE_RECIPE_OUTCOME.NO_HOUSEHOLD:
      return RECIPE_AUDIENCE_TEXT.NO_HOUSEHOLD;
    case SAVE_RECIPE_OUTCOME.HOUSEHOLD_LIMIT:
      return RECIPE_AUDIENCE_TEXT.HOUSEHOLD_LIMIT;
    case SAVE_RECIPE_OUTCOME.SHARE_FAILED:
      return RECIPE_AUDIENCE_TEXT.SHARE_FAILED;
    default:
      return RECIPE_EDITOR_TEXT.SAVE_ERROR;
  }
};

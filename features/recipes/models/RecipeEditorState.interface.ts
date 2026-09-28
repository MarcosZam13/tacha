import type { NullableRef } from "@/types/nullable.types";
import type { RecipeEditorStatusType } from "../constants/recipes.constants";
import type { RecipeEditorErrors } from "./RecipeEditorErrors.interface";
import type { RecipeEditorValues } from "./RecipeEditorValues.interface";

export interface RecipeEditorState {
  errors: RecipeEditorErrors;
  /** Aviso no bloqueante del buscador, ej. "ese producto ya está". */
  ingredientNotice: NullableRef<string>;
  saveErrorMessage: NullableRef<string>;
  status: RecipeEditorStatusType;
  values: RecipeEditorValues;
}

import type { RecipeEditorIngredient } from "./RecipeEditorIngredient.interface";

/** Lo que el usuario escribió en el formulario, tal cual (sin convertir). */
export interface RecipeEditorValues {
  baseServings: string;
  ingredients: RecipeEditorIngredient[];
  name: string;
}

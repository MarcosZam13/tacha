/**
 * Una receta tal como la devuelve RECIPES_DB.EDITOR_SELECT. Solo la conoce
 * el adapter (utils/toRecipeEditorValues.ts): el formulario nunca ve esta forma.
 */
export interface RecipeEditorRow {
  base_servings: number;
  id: string;
  name: string;
  recipe_ingredients: {
    position: number;
    product_catalog: { id: string; name: string };
    quantity_unit: string;
    quantity_value: number;
  }[];
}

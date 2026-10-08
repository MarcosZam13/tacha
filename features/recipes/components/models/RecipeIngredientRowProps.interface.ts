import type { CatalogBaseUnitType } from "@/constants";
import type { RecipeIngredientRowViewModel } from "../../models/recipe-editor.interfaces";

export interface RecipeIngredientRowProps {
  ingredient: RecipeIngredientRowViewModel;
  onQuantityChange: (productId: string, quantity: string) => void;
  onRemove: (productId: string) => void;
  onUnitChange: (productId: string, unit: CatalogBaseUnitType) => void;
}

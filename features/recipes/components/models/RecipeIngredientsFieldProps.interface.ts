import type { ProductSearchProps } from "@/components/product-search/models/ProductSearchProps.interface";
import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { RecipeIngredientRowViewModel } from "../../models/RecipeIngredientRowViewModel.interface";

export interface RecipeIngredientsFieldProps {
  ingredientNotice: NullableRef<string>;
  ingredients: RecipeIngredientRowViewModel[];
  ingredientsError: NullableUndefined<string>;
  ingredientSearch: ProductSearchProps;
  onIngredientQuantityChange: (productId: string, quantity: string) => void;
  onIngredientUnitChange: (productId: string, unit: CatalogBaseUnitType) => void;
  onRemoveIngredient: (productId: string) => void;
}

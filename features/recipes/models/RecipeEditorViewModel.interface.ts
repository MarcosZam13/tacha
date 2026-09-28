import type { FormEvent } from "react";
import type { ProductSearchProps } from "@/components/product-search/models/ProductSearchProps.interface";
import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { RecipeIngredientRowViewModel } from "./RecipeIngredientRowViewModel.interface";

/** Lo que useRecipeEditorViewModel le entrega a RecipeEditor.tsx, ya calculado. */
export interface RecipeEditorViewModel {
  baseServings: string;
  baseServingsError: NullableUndefined<string>;
  ingredientNotice: NullableRef<string>;
  ingredients: RecipeIngredientRowViewModel[];
  ingredientsError: NullableUndefined<string>;
  /** Props del buscador compartido, listas para pasar a <ProductSearch />. */
  ingredientSearch: ProductSearchProps;
  isLoading: boolean;
  isNotFound: boolean;
  isSaving: boolean;
  loadErrorMessage: NullableRef<string>;
  name: string;
  nameError: NullableUndefined<string>;
  onBaseServingsChange: (baseServings: string) => void;
  onIngredientQuantityChange: (productId: string, quantity: string) => void;
  onIngredientUnitChange: (productId: string, unit: CatalogBaseUnitType) => void;
  onNameChange: (name: string) => void;
  onRemoveIngredient: (productId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saveErrorMessage: NullableRef<string>;
  showForm: boolean;
  title: string;
}

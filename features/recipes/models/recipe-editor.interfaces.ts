import type { FormEvent } from "react";
import type { ProductSearchProps } from "@/components/product-search/models/ProductSearchProps.interface";
import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { RecipeEditorStatusType } from "../constants/recipes.constants";

// Interfaces del editor de recetas (SCRUM-95), en el orden en que se usan:
// la entrada, la fila de la base, el formulario, el estado del reducer, lo que
// ve la pantalla y la mutación. Las acciones del reducer están en
// recipe-editor.types.ts.

export interface RecipeEditorProps {
  /** Sin id: receta nueva. Con id: editar esa receta. */
  recipeId?: string;
}

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

/**
 * Un ingrediente mientras se edita la receta. Queda ligado al producto madre
 * desde que se elige (CA-02). La cantidad es texto porque es lo que hay en
 * el input: "0," o "" se volverían 0 si se guardaran como número al escribir.
 */
export interface RecipeEditorIngredient {
  productId: string;
  productName: string;
  quantity: string;
  unit: CatalogBaseUnitType;
}

/** Lo que el usuario escribió en el formulario, tal cual (sin convertir). */
export interface RecipeEditorValues {
  baseServings: string;
  ingredients: RecipeEditorIngredient[];
  name: string;
}

/**
 * Un mensaje por campo; sin valor = sin error. Los de cantidad van por
 * productId porque cada ingrediente tiene su propio input.
 */
export interface RecipeEditorErrors {
  baseServings?: string;
  ingredients?: string;
  name?: string;
  quantityByProductId: Record<string, string>;
}

export interface RecipeEditorState {
  errors: RecipeEditorErrors;
  /** Aviso no bloqueante del buscador, ej. "ese producto ya está". */
  ingredientNotice: NullableRef<string>;
  saveErrorMessage: NullableRef<string>;
  status: RecipeEditorStatusType;
  values: RecipeEditorValues;
}

/**
 * Un ingrediente listo para dibujar: el mismo del formulario más su error.
 * Extiende en vez de copiar los campos, así si el ingrediente gana uno nuevo
 * la fila lo recibe sin tocar esta interfaz.
 */
export interface RecipeIngredientRowViewModel extends RecipeEditorIngredient {
  quantityError: NullableUndefined<string>;
}

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

/**
 * Lo que se manda a save_recipe, ya validado y convertido a números
 * (nextjs-enterprise-patterns §4). Sin owner_id ni household_id: el dueño
 * lo pone la base con auth.uid().
 */
export interface SaveRecipePayload {
  baseServings: number;
  ingredients: {
    productId: string;
    quantityUnit: CatalogBaseUnitType;
    quantityValue: number;
  }[];
  name: string;
  /** Sin valor = receta nueva; con valor = editar esa receta. */
  recipeId: NullableUndefined<string>;
}

/** Lo que devuelve save_recipe: el id de la receta creada o editada. */
export interface SaveRecipeResponse {
  recipeId: string;
}

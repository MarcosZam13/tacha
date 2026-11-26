import type { FormEvent } from "react";
import type { ProductSearchProps } from "@/components/product-search/models/ProductSearchProps.interface";
import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { RecipeAudienceType, RecipeEditorStatusType } from "../constants/recipes.constants";
import type { RecipePhotoFieldViewModel, SavedRecipePhoto } from "./recipe-photo.interfaces";
import type { RecipePhotoChange } from "./recipe-photo.types";
import type { RecipeAudienceFieldViewModel } from "./recipe-sharing.interfaces";

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
  household_id: NullableRef<string>;
  id: string;
  name: string;
  photo_path: NullableRef<string>;
  recipe_ingredients: {
    position: number;
    /** null si quien consulta ya no puede ver el producto (de una familia anterior). */
    product_catalog: NullableRef<{ name: string }>;
    product_catalog_id: string;
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

/** Una receta guardada, lista para editar: los valores del formulario, su foto (null si no tiene) y si es de la familia. */
export interface RecipeForEditing {
  isShared: boolean;
  photo: NullableRef<SavedRecipePhoto>;
  values: RecipeEditorValues;
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
  /** Para quién se guardará. Una receta de la familia ya no cambia (isShared). */
  audience: RecipeAudienceType;
  errors: RecipeEditorErrors;
  /** La persona ya tocó el formulario (SCRUM-55: cerrar sesión pide confirmación). Se apaga al cargar la receta. */
  hasChanges: boolean;
  /** Al compartir, la base dijo que ya no tiene familia: se deja de ofrecer. */
  hasLostHousehold: boolean;
  /** Aviso no bloqueante del buscador, ej. "ese producto ya está". */
  ingredientNotice: NullableRef<string>;
  isShared: boolean;
  saveErrorMessage: NullableRef<string>;
  savedPhoto: NullableRef<SavedRecipePhoto>;
  /** Id de la receta que se guardó a medias (sin su foto o sin compartir): reintentar edita esa en vez de crear otra. */
  savedRecipeId: NullableRef<string>;
  status: RecipeEditorStatusType;
  values: RecipeEditorValues;
}

/** Lo que useRecipeEditor le entrega al ViewModel: el estado y una función por cada cambio. */
export interface UseRecipeEditorReturn {
  addIngredient: (ingredient: RecipeEditorIngredient) => void;
  changeAudience: (audience: RecipeAudienceType) => void;
  changeBaseServings: (baseServings: string) => void;
  changeIngredientQuantity: (productId: string, quantity: string) => void;
  changeIngredientUnit: (productId: string, unit: CatalogBaseUnitType) => void;
  changeName: (name: string) => void;
  removeIngredient: (productId: string) => void;
  /** Valida, guarda la receta y su foto, y la comparte si se pidió. Devuelve true si se guardó todo, para que quien llama navegue. */
  save: (photoChange: RecipePhotoChange) => Promise<boolean>;
  state: RecipeEditorState;
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
  audience: RecipeAudienceFieldViewModel;
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
  photo: RecipePhotoFieldViewModel;
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

/** Todo lo que hace falta para el guardado completo (services/recipe-save.service.ts). */
export interface SaveRecipeWithExtrasPayload {
  photoChange: RecipePhotoChange;
  recipe: SaveRecipePayload;
  shouldShare: boolean;
}

/** Lo que devuelve save_recipe: el id de la receta creada o editada. */
export interface SaveRecipeResponse {
  recipeId: string;
}

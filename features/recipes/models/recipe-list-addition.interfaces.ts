import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";
import type { RecipeListAdditionTarget } from "./recipe-list-addition.types";

// Interfaces de agregar una receta a la lista (SCRUM-97), en el orden en que
// se usan: lo que devuelve la base, la mutación, lo que ve la pantalla. Los
// types (la receta elegida y la unión de estados) están en
// recipe-list-addition.types.ts.

/**
 * Lo que devuelve la RPC add_recipe_to_general_list (013), tal cual. Solo lo
 * conoce el adapter (utils/toAddRecipeToListResponse.ts).
 */
export interface AddRecipeToListRow {
  added: string[];
  missing: { product_name: string; quantity: number; unit: string }[];
  skipped: string[];
}

/**
 * Lo que se manda para agregar una receta (nextjs-enterprise-patterns §4).
 * Solo el id: cantidades, presentaciones y faltantes los calcula la base.
 */
export interface AddRecipeToListPayload {
  recipeId: string;
}

/** Un producto que no alcanzó, con lo que falta en la unidad del ingrediente. */
export interface AddRecipeToListMissingItem {
  productName: string;
  quantity: number;
  unit: CatalogBaseUnitType;
}

/** Resultado de agregar una receta, ya adaptado: qué se sumó, qué falta y qué se saltó. */
export interface AddRecipeToListResponse {
  addedProductNames: string[];
  missingItems: AddRecipeToListMissingItem[];
  /** Productos sin ninguna presentación en el catálogo (regla 26): no se agregaron. */
  skippedProductNames: string[];
}

/** Lo que muestra una tarjeta después de agregar: el resumen o el error. */
export interface RecipeAddToListFeedback {
  isError: boolean;
  /** Una línea por idea ("Agregaste…", "Te falta comprar: …"); ya armadas. */
  messages: string[];
  recipeId: string;
}

/** Lo que necesita una tarjeta para su botón "Agregar receta a lista" y su resumen. */
export interface RecipeCardAddToList {
  /** Resumen o error de esta receta; null si la última acción fue de otra receta o no hubo ninguna. */
  feedback: NullableRef<RecipeAddToListFeedback>;
  /** true solo en la tarjeta que se está agregando ("Agregando…"). */
  isAdding: boolean;
  /** true en todas las tarjetas mientras se agrega cualquier receta: una a la vez. */
  isDisabled: boolean;
}

/** Lo que useRecipeListAddition le entrega al catálogo: el botón de cada tarjeta y el diálogo de repetir. */
export interface RecipeListAdditionViewModel {
  /** Estado del botón y del resumen de una tarjeta, ya calculado para esa receta. */
  getRecipeAddToList: (recipeId: string) => RecipeCardAddToList;
  isRepeatDialogOpen: boolean;
  onAddRequest: (recipe: RecipeListAdditionTarget) => void;
  onRepeatCancel: () => void;
  onRepeatConfirm: () => void;
  /** Nombre de la receta del diálogo de repetir; null con el diálogo cerrado. */
  repeatRecipeName: NullableRef<string>;
}

import type { NullableRef } from "@/types/nullable.types";
import type { RecipeDeletionTarget } from "./recipe-deletion.types";

// Interfaces de la eliminación de una receta (SCRUM-96). Los types (la
// receta elegida y la unión de estados) están en recipe-deletion.types.ts.

/** Lo que recibe useRecipeDeletion desde el ViewModel del catálogo. */
export interface UseRecipeDeletionParams {
  /** Se llama cuando la base confirmó el borrado, para que el catálogo quite la receta. */
  onDeleted: (recipeId: string) => void;
}

/** Lo que useRecipeDeletion le entrega al catálogo: el diálogo y el botón de cada tarjeta. */
export interface RecipeDeletionViewModel {
  /** Mensaje de error dentro del diálogo; null si no falló. */
  errorMessage: NullableRef<string>;
  isDeleting: boolean;
  isDialogOpen: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onDeleteRequest: (recipe: RecipeDeletionTarget) => void;
  /** Nombre de la receta elegida; null con el diálogo cerrado. */
  recipeName: NullableRef<string>;
}

/**
 * Lo que se manda para borrar una receta (nextjs-enterprise-patterns §4).
 * Solo el id: quién puede borrarla lo decide RLS con auth.uid(), nunca un
 * owner_id que mande el cliente.
 */
export interface DeleteRecipePayload {
  recipeId: string;
}

/**
 * Resultado de borrar una receta: el id que se pidió borrar. Es el mismo
 * resultado si la receta ya no existía o era ajena (RLS borra 0 filas sin
 * error), para no revelar si una receta ajena existe.
 */
export interface DeleteRecipeResponse {
  recipeId: string;
}

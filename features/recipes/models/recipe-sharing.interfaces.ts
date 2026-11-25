import type { NullableRef } from "@/types/nullable.types";
import type { RecipeAudienceType } from "../constants/recipes.constants";

// Interfaces de compartir y copiar recetas (SCRUM-162). Los types están en
// recipe-sharing.types.ts.

/** Lo que dibuja "¿Para quién es?", ya calculado. */
export interface RecipeAudienceFieldViewModel {
  audience: RecipeAudienceType;
  /** Tiene familia y la receta todavía es personal. */
  canChoose: boolean;
  isShared: boolean;
  onAudienceChange: (audience: RecipeAudienceType) => void;
}

/** "Guardar copia personal" de una tarjeta. */
export interface RecipeCardCopy {
  errorMessage: NullableRef<string>;
  isCopying: boolean;
  successMessage: NullableRef<string>;
}

export interface RecipeCopyViewModel {
  getRecipeCopy: (recipeId: string) => RecipeCardCopy;
  onCopyRequest: (recipeId: string) => void;
}

export interface UseRecipeCopyParams {
  /** Se llama cuando la base confirmó la copia, para que el catálogo la muestre. */
  onCopied: () => void;
}

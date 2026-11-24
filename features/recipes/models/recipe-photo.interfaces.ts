import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { RecipePhotoChange } from "./recipe-photo.types";

// Interfaces de la foto de una receta (SCRUM-161). Los types están en
// recipe-photo.types.ts.

/** La foto que ya tiene la receta. `url` es null si no se pudo pedir el enlace: la foto existe igual. */
export interface SavedRecipePhoto {
  url: NullableRef<string>;
}

export interface SaveRecipePhotoPayload {
  change: RecipePhotoChange;
  recipeId: string;
}

/** El cambio elegido y su vista previa local; null si no hay archivo elegido. */
export interface PendingRecipePhoto {
  change: RecipePhotoChange;
  previewUrl: NullableRef<string>;
}

/** Lo que useRecipePhoto le entrega al editor. */
export interface UseRecipePhotoReturn {
  change: RecipePhotoChange;
  errorMessage: NullableUndefined<string>;
  hasPendingChange: boolean;
  /** Hay una foto que se puede cambiar o quitar, aunque su enlace no haya cargado. */
  hasPhoto: boolean;
  isPreview: boolean;
  onPhotoRemove: () => void;
  onPhotoSelect: (file: File) => void;
  photoUrl: NullableRef<string>;
}

/** Lo que dibuja el campo de foto, ya calculado. */
export interface RecipePhotoFieldViewModel
  extends Pick<UseRecipePhotoReturn, "errorMessage" | "hasPhoto" | "onPhotoRemove" | "onPhotoSelect" | "photoUrl"> {
  alt: string;
}

import { useEffect, useState } from "react";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import { RECIPE_PHOTO_CHANGE } from "../constants/recipes.constants";
import type { PendingRecipePhoto, SavedRecipePhoto, UseRecipePhotoReturn } from "../models/recipe-photo.interfaces";
import { validateRecipePhoto } from "../utils/validateRecipePhoto";

const NO_PENDING_PHOTO: PendingRecipePhoto = { change: { kind: RECIPE_PHOTO_CHANGE.KEEP }, previewUrl: null };

/**
 * La foto del formulario: qué se eligió y su vista previa. Nada se sube acá; el
 * cambio se guarda con la receta (SPEC regla 38).
 *
 * useState y no useReducer: pocas transiciones, y la unión del cambio impide
 * "quitar" y "reemplazar" a la vez.
 */
export const useRecipePhoto = (savedPhoto: NullableRef<SavedRecipePhoto>): UseRecipePhotoReturn => {
  const [pendingPhoto, setPendingPhoto] = useState<PendingRecipePhoto>(NO_PENDING_PHOTO);
  const [errorMessage, setErrorMessage] = useState<NullableUndefined<string>>(undefined);
  const { change, previewUrl } = pendingPhoto;

  // La vista previa ocupa memoria del navegador hasta que se libera: al cambiarla o al salir.
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const onPhotoSelect = (file: File): void => {
    const fileError = validateRecipePhoto(file);
    setErrorMessage(fileError);
    // Un archivo que no sirve no reemplaza lo que había (SPEC regla 37).
    if (fileError) return;

    setPendingPhoto({
      change: { file, kind: RECIPE_PHOTO_CHANGE.REPLACE },
      previewUrl: URL.createObjectURL(file),
    });
  };

  const onPhotoRemove = (): void => {
    setErrorMessage(undefined);
    // Con una foto recién elegida vuelve a la guardada; con la guardada a la vista, la marca para quitarla.
    setPendingPhoto(
      savedPhoto && change.kind === RECIPE_PHOTO_CHANGE.KEEP
        ? { change: { kind: RECIPE_PHOTO_CHANGE.REMOVE }, previewUrl: null }
        : NO_PENDING_PHOTO,
    );
  };

  const isKeeping = change.kind === RECIPE_PHOTO_CHANGE.KEEP;
  const isPreview = change.kind === RECIPE_PHOTO_CHANGE.REPLACE;

  return {
    change,
    errorMessage,
    hasPendingChange: !isKeeping,
    hasPhoto: isPreview || (isKeeping && savedPhoto !== null),
    isPreview,
    onPhotoRemove,
    onPhotoSelect,
    photoUrl: isKeeping ? (savedPhoto?.url ?? null) : previewUrl,
  };
};

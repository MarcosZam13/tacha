import { IMAGE_FILE_EXTENSION_BY_MIME_TYPE, POSTGRES_ERROR_CODE } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import {
  RECIPE_PHOTO_CHANGE,
  RECIPE_PHOTO_STORAGE,
  RECIPES_DB,
  SAVE_RECIPE_PHOTO_RESULT,
} from "../constants/recipes.constants";
import type { SaveRecipePhotoResultType } from "../constants/recipes.constants";
import type { SaveRecipePhotoPayload } from "../models/recipe-photo.interfaces";
import { hasPhotoMetadata } from "../utils/hasPhotoMetadata";
import { removePhotoMetadata } from "../utils/removePhotoMetadata";

// La base rechazó la ruta, así que seguro no quedó guardada. Con cualquier otro error (red cortada, un 5xx)
// no se sabe.
const REJECTED_PHOTO_CODES: readonly string[] = [
  POSTGRES_ERROR_CODE.CHECK_VIOLATION,
  POSTGRES_ERROR_CODE.NO_DATA_FOUND,
];

const getPhotoBucket = () => getSupabaseClient().storage.from(RECIPE_PHOTO_STORAGE.BUCKET);

/**
 * Enlaces temporales de las fotos, por ruta, en una sola petición. No lanza: la
 * foto nunca bloquea la pantalla (SPEC regla 49). Las que no se pudieron firmar
 * no están en el mapa.
 */
export const getRecipePhotoUrls = async (photoPaths: string[]): Promise<Map<string, string>> => {
  const urlByPath = new Map<string, string>();
  if (photoPaths.length === 0) return urlByPath;

  try {
    const { data } = await getPhotoBucket().createSignedUrls(photoPaths, RECIPE_PHOTO_STORAGE.SIGNED_URL_SECONDS);
    data?.forEach(({ path, signedUrl }) => {
      if (path && signedUrl) urlByPath.set(path, signedUrl);
    });
  } catch {
    // Sin enlaces se ven las iniciales.
  }

  return urlByPath;
};

/**
 * Borra un archivo. Es limpieza: si falla queda un archivo suelto que nadie usa,
 * y la acción del usuario no falla (SPEC regla 47).
 */
export const removeRecipePhotoFile = async (photoPath: NullableRef<string>): Promise<void> => {
  if (!photoPath) return;

  try {
    await getPhotoBucket().remove([photoPath]);
  } catch {
    // Nada que hacer: ver arriba.
  }
};

// Cada subida es un archivo nuevo en la carpeta de la receta, sin metadatos. null
// si no se pudo subir; lanza si no se pudo limpiar (saveRecipePhoto lo atrapa).
const uploadRecipePhoto = async (recipeId: string, file: File): Promise<NullableRef<string>> => {
  const cleanFile = await removePhotoMetadata(file);
  const extension = IMAGE_FILE_EXTENSION_BY_MIME_TYPE[cleanFile.type];
  if (!extension) return null;

  const photoPath = `${recipeId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await getPhotoBucket().upload(photoPath, cleanFile, { contentType: cleanFile.type, upsert: false });

  return error ? null : photoPath;
};

/**
 * Guarda el cambio de foto de una receta ya guardada. No lanza: devuelve qué pasó.
 *
 * Orden para fallar seguro: (1) subir, (2) guardar la ruta, que devuelve la
 * anterior, (3) borrar la anterior. Nunca queda una receta apuntando a un archivo
 * que no existe: la foto recién subida solo se borra si la base la rechazó. Con
 * otro error (se cortó la red, un 5xx) puede haberla guardado, así que se deja: a
 * lo sumo queda un archivo suelto.
 */
export const saveRecipePhoto = async ({
  change,
  recipeId,
}: SaveRecipePhotoPayload): Promise<SaveRecipePhotoResultType> => {
  if (change.kind === RECIPE_PHOTO_CHANGE.KEEP) return SAVE_RECIPE_PHOTO_RESULT.SAVED;

  try {
    const newPhotoPath =
      change.kind === RECIPE_PHOTO_CHANGE.REPLACE ? await uploadRecipePhoto(recipeId, change.file) : null;
    if (change.kind === RECIPE_PHOTO_CHANGE.REPLACE && !newPhotoPath) return SAVE_RECIPE_PHOTO_RESULT.FAILED;

    const { data: previousPhotoPath, error } = await getSupabaseClient().rpc(RECIPES_DB.RPC.SET_RECIPE_PHOTO, {
      // Sin ruta la función quita la foto.
      new_photo_path: newPhotoPath ?? undefined,
      target_recipe_id: recipeId,
    });
    if (error) {
      if (REJECTED_PHOTO_CODES.includes(error.code)) void removeRecipePhotoFile(newPhotoPath);
      return error.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND
        ? SAVE_RECIPE_PHOTO_RESULT.NOT_FOUND
        : SAVE_RECIPE_PHOTO_RESULT.FAILED;
    }

    void removeRecipePhotoFile(previousPhotoPath);
    return SAVE_RECIPE_PHOTO_RESULT.SAVED;
  } catch {
    return SAVE_RECIPE_PHOTO_RESULT.FAILED;
  }
};

/**
 * Limpia la foto que la receta ya tiene, antes de compartirla: puede ser anterior a
 * que se quitaran los metadatos (SPEC regla 72). La ruta se lee en el momento, así
 * reintentar no usa una que ya se reemplazó. Devuelve si quedó lista; no lanza.
 */
export const cleanSavedRecipePhoto = async (recipeId: string): Promise<boolean> => {
  try {
    const { data: recipeRow, error } = await getSupabaseClient()
      .from(RECIPES_DB.TABLE.RECIPES)
      .select(RECIPES_DB.COLUMN.PHOTO_PATH)
      .eq(RECIPES_DB.COLUMN.ID, recipeId)
      .maybeSingle();
    if (error || !recipeRow) return false;
    if (!recipeRow.photo_path) return true;

    const { data: savedPhoto, error: downloadError } = await getPhotoBucket().download(recipeRow.photo_path);
    if (downloadError) return false;
    // Comprimirla otra vez le quitaría calidad en cada intento.
    if (!(await hasPhotoMetadata(savedPhoto))) return true;

    const file = new File([savedPhoto], recipeRow.photo_path, { type: savedPhoto.type });
    const result = await saveRecipePhoto({ change: { file, kind: RECIPE_PHOTO_CHANGE.REPLACE }, recipeId });
    return result === SAVE_RECIPE_PHOTO_RESULT.SAVED;
  } catch {
    return false;
  }
};

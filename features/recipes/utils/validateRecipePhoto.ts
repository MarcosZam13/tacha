import { IMAGE_FILE_EXTENSION_BY_MIME_TYPE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { RECIPE_PHOTO_ERROR, RECIPE_PHOTO_MAX_FILE_SIZE_BYTES } from "../constants/recipes.constants";

/**
 * Mensaje de error de la foto elegida, o undefined si se puede subir. Es el
 * aviso temprano: el bucket vuelve a revisar el tipo y el tamaño en el servidor.
 */
export const validateRecipePhoto = (file: Pick<File, "size" | "type">): NullableUndefined<string> => {
  if (!Object.hasOwn(IMAGE_FILE_EXTENSION_BY_MIME_TYPE, file.type)) return RECIPE_PHOTO_ERROR.TYPE_NOT_ALLOWED;
  if (file.size === 0) return RECIPE_PHOTO_ERROR.EMPTY_FILE;
  return file.size > RECIPE_PHOTO_MAX_FILE_SIZE_BYTES ? RECIPE_PHOTO_ERROR.TOO_LARGE : undefined;
};

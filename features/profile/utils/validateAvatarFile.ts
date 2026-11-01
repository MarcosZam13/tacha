import type { NullableUndefined } from "@/types/nullable.types";
import {
  AVATAR_FILE_EXTENSION_BY_MIME_TYPE,
  AVATAR_MAX_FILE_SIZE_BYTES,
  PROFILE_ERROR_MESSAGE,
} from "../constants/profile.constants";

/**
 * Mensaje de error de la foto elegida, o `undefined` si se puede subir. Es el aviso temprano: el bucket
 * vuelve a revisar el tipo y el tamaño en el servidor. Función pura.
 */
export const validateAvatarFile = (file: Pick<File, "size" | "type">): NullableUndefined<string> => {
  if (!(file.type in AVATAR_FILE_EXTENSION_BY_MIME_TYPE)) {
    return PROFILE_ERROR_MESSAGE.PHOTO_TYPE_NOT_ALLOWED;
  }

  return file.size > AVATAR_MAX_FILE_SIZE_BYTES ? PROFILE_ERROR_MESSAGE.PHOTO_TOO_LARGE : undefined;
};

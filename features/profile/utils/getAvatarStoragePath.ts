import type { NullableRef } from "@/types/nullable.types";
import { AVATAR_STORAGE } from "../constants/profile.constants";

/**
 * Ruta del objeto dentro del bucket (`<user_id>/<uuid>.<ext>`) a partir de la URL pública guardada en
 * `avatar_url`, para poder borrar la foto anterior. null si la URL no es de una foto del bucket (vacía, de
 * otro sitio o editada a mano): en ese caso no se borra nada. Función pura.
 */
export const getAvatarStoragePath = (avatarUrl: NullableRef<string>): NullableRef<string> => {
  if (!avatarUrl) return null;

  const segmentIndex = avatarUrl.indexOf(AVATAR_STORAGE.PUBLIC_URL_SEGMENT);
  if (segmentIndex === -1) return null;

  const storagePath = avatarUrl.slice(segmentIndex + AVATAR_STORAGE.PUBLIC_URL_SEGMENT.length);

  // Los parámetros de la URL (?t=...) no son parte de la ruta.
  const [pathWithoutQuery] = storagePath.split("?");

  return pathWithoutQuery.length > 0 ? decodeURIComponent(pathWithoutQuery) : null;
};

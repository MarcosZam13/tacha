import type { NullableUndefined } from "@/types/nullable.types";
import { PROFILE_ERROR_MESSAGE, PROFILE_NAME_MAX_LENGTH } from "../constants/profile.constants";

/**
 * Mensaje de error del nombre, o `undefined` si es válido. El nombre es obligatorio (se recorta antes de
 * mirarlo, así que solo espacios cuenta como vacío) y tiene un máximo. Función pura.
 */
export const validateProfileName = (name: string): NullableUndefined<string> => {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) return PROFILE_ERROR_MESSAGE.NAME_REQUIRED;

  return trimmedName.length > PROFILE_NAME_MAX_LENGTH ? PROFILE_ERROR_MESSAGE.NAME_TOO_LONG : undefined;
};

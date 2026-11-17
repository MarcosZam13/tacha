import { USER_NAME_MAX_LENGTH } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { COMPLETE_SIGN_UP_ERROR } from "../constants/complete-sign-up.constants";

// Mismas reglas que el nombre del perfil: obligatorio (solo espacios cuenta como vacío) y con el
// mismo máximo, para que el perfil después acepte el nombre que se guardó acá.
export const validateSignUpName = (name: string): NullableUndefined<string> => {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) return COMPLETE_SIGN_UP_ERROR.NAME_REQUIRED;

  return trimmedName.length > USER_NAME_MAX_LENGTH ? COMPLETE_SIGN_UP_ERROR.NAME_TOO_LONG : undefined;
};

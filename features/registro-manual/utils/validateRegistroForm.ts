import type { NullableUndefined } from "@/types/nullable.types";
import {
  REGISTRO_EMAIL_PATTERN,
  REGISTRO_ERROR_MESSAGE,
  REGISTRO_FIELD,
  REGISTRO_PASSWORD_MIN_LENGTH,
} from "../constants/registro.constants";
import type {
  RegistroFormErrors,
  RegistroFormValues,
} from "../models/RegistroFormValues.interface";

// Recorta espacios y pasa a minúsculas
export const normalizeRegistroEmail = (email: string): string =>
  email.trim().toLowerCase();

// Habilita el botón
export const isRegistroFormComplete = (values: RegistroFormValues): boolean =>
  values.name.trim().length > 0 &&
  values.email.trim().length > 0 &&
  values.password.length > 0 &&
  values.confirmPassword.length > 0;

const validateName = (name: string): NullableUndefined<string> =>
  name.trim().length === 0 ? REGISTRO_ERROR_MESSAGE.NAME_REQUIRED : undefined;

const validateEmail = (email: string): NullableUndefined<string> =>
  normalizeRegistroEmail(email).length === 0
    ? REGISTRO_ERROR_MESSAGE.EMAIL_REQUIRED
    : !REGISTRO_EMAIL_PATTERN.test(normalizeRegistroEmail(email))
      ? REGISTRO_ERROR_MESSAGE.EMAIL_INVALID
      : undefined;

const validatePassword = (password: string): NullableUndefined<string> =>
  password.length === 0
    ? REGISTRO_ERROR_MESSAGE.PASSWORD_REQUIRED
    : password.length < REGISTRO_PASSWORD_MIN_LENGTH
      ? REGISTRO_ERROR_MESSAGE.PASSWORD_TOO_SHORT
      : undefined;

const validateConfirmPassword = (confirmPassword: string): NullableUndefined<string> =>
  confirmPassword.length === 0
    ? REGISTRO_ERROR_MESSAGE.REPEAT_PASSWORD_REQUIRED
    : undefined;

// Un campo válido queda en undefined. Para saber si hay errores usar hasRegistroErrors.
export const validateRegistroForm = (values: RegistroFormValues): RegistroFormErrors => ({
  [REGISTRO_FIELD.CONFIRM_PASSWORD]: validateConfirmPassword(values.confirmPassword),
  [REGISTRO_FIELD.EMAIL]: validateEmail(values.email),
  [REGISTRO_FIELD.NAME]: validateName(values.name),
  [REGISTRO_FIELD.PASSWORD]: validatePassword(values.password),
});

export const hasRegistroErrors = (errors: RegistroFormErrors): boolean =>
  Object.values(errors).some((message) => message !== undefined);
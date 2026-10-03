import type { NullableUndefined } from "@/types/nullable.types";
import { EMAIL_PATTERN } from "@/constants";
import { normalizeEmail } from "@/utils/email.utils";
import {
  REGISTRO_ERROR_MESSAGE,
  REGISTRO_FIELD,
  REGISTRO_PASSWORD_MIN_LENGTH,
} from "../constants/registro.constants";
import type {
  RegistroFormErrors,
  RegistroFormValues,
} from "../models/RegistroFormValues.interface";

// Habilita el botón
export const isRegistroFormComplete = (values: RegistroFormValues): boolean =>
  values.name.length > 0 &&
  values.email.length > 0 &&
  values.password.length > 0 &&
  values.confirmPassword.length > 0;

export const validateName = (name: string): NullableUndefined<string> =>
  name.trim().length === 0 ? REGISTRO_ERROR_MESSAGE.NAME_REQUIRED : undefined;

export const validateEmail = (email: string): NullableUndefined<string> =>
  normalizeEmail(email).length === 0
    ? REGISTRO_ERROR_MESSAGE.EMAIL_REQUIRED
    : !EMAIL_PATTERN.test(normalizeEmail(email))
      ? REGISTRO_ERROR_MESSAGE.EMAIL_INVALID
      : undefined;

const validatePassword = (password: string): NullableUndefined<string> =>
  password.length === 0
    ? REGISTRO_ERROR_MESSAGE.PASSWORD_REQUIRED
    : password.length < REGISTRO_PASSWORD_MIN_LENGTH
      ? REGISTRO_ERROR_MESSAGE.PASSWORD_TOO_SHORT
      : undefined;

// Solo compara cuando ya se escribió algo: el campo vacío lo cubre validateConfirmPassword.
export const validatePasswordsMatch = (
  password: string,
  confirmPassword: string,
): NullableUndefined<string> =>
  confirmPassword.length > 0 && confirmPassword !== password
    ? REGISTRO_ERROR_MESSAGE.PASSWORDS_MISMATCH
    : undefined;

const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
): NullableUndefined<string> =>
  confirmPassword.length === 0
    ? REGISTRO_ERROR_MESSAGE.REPEAT_PASSWORD_REQUIRED
    : validatePasswordsMatch(password, confirmPassword);

// Un campo válido queda en undefined. Para saber si hay errores usar hasRegistroErrors.
export const validateRegistroForm = (values: RegistroFormValues): RegistroFormErrors => ({
  [REGISTRO_FIELD.CONFIRM_PASSWORD]: validateConfirmPassword(
    values.password, 
    values.confirmPassword,
  ),
  [REGISTRO_FIELD.EMAIL]: validateEmail(values.email),
  [REGISTRO_FIELD.NAME]: validateName(values.name),
  [REGISTRO_FIELD.PASSWORD]: validatePassword(values.password),
});

export const hasRegistroErrors = (errors: RegistroFormErrors): boolean =>
  Object.values(errors).some((message) => message !== undefined);

import {
  NEW_PASSWORD_ERROR_MESSAGE,
  NEW_PASSWORD_FIELD,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_LEVEL,
} from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import type { NewPasswordFormErrors, NewPasswordFormValues } from "@/types/new-password.types";
import { evaluatePasswordStrength } from "./password.utils";

// La nueva contraseña no puede ser de nivel débil: cambiar una débil por otra no cumple el propósito.
const validateNewPassword = (password: string): NullableUndefined<string> =>
  password.length === 0
    ? NEW_PASSWORD_ERROR_MESSAGE.PASSWORD_REQUIRED
    : password.length < PASSWORD_MIN_LENGTH
      ? NEW_PASSWORD_ERROR_MESSAGE.PASSWORD_TOO_SHORT
      : evaluatePasswordStrength(password).level === PASSWORD_STRENGTH_LEVEL.WEAK
        ? NEW_PASSWORD_ERROR_MESSAGE.PASSWORD_TOO_WEAK
        : undefined;

const validateConfirmPassword = (
  newPassword: string,
  confirmPassword: string,
): NullableUndefined<string> =>
  confirmPassword.length === 0
    ? NEW_PASSWORD_ERROR_MESSAGE.CONFIRM_REQUIRED
    : confirmPassword !== newPassword
      ? NEW_PASSWORD_ERROR_MESSAGE.PASSWORDS_MISMATCH
      : undefined;

// Un campo válido queda en undefined. Para saber si hay errores usar hasNewPasswordErrors.
export const validateNewPasswordForm = (
  values: NewPasswordFormValues,
): NewPasswordFormErrors => ({
  [NEW_PASSWORD_FIELD.CONFIRM_PASSWORD]: validateConfirmPassword(
    values.newPassword,
    values.confirmPassword,
  ),
  [NEW_PASSWORD_FIELD.NEW_PASSWORD]: validateNewPassword(values.newPassword),
});

export const hasNewPasswordErrors = (errors: NewPasswordFormErrors): boolean =>
  Object.values(errors).some((message) => message !== undefined);

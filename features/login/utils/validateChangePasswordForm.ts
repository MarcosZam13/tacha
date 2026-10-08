import { PASSWORD_MIN_LENGTH, PASSWORD_STRENGTH_LEVEL } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { evaluatePasswordStrength } from "@/utils/password.utils";
import {
  CHANGE_PASSWORD_ERROR_MESSAGE,
  CHANGE_PASSWORD_FIELD,
} from "../constants/login.constants";
import type {
  ChangePasswordFormErrors,
  ChangePasswordFormValues,
} from "../models/ChangePasswordFormValues.interface";

// La nueva contraseña no puede ser de nivel débil: cambiar una débil por otra no cumple el propósito.
const validateNewPassword = (password: string): NullableUndefined<string> =>
  password.length === 0
    ? CHANGE_PASSWORD_ERROR_MESSAGE.PASSWORD_REQUIRED
    : password.length < PASSWORD_MIN_LENGTH
      ? CHANGE_PASSWORD_ERROR_MESSAGE.PASSWORD_TOO_SHORT
      : evaluatePasswordStrength(password).level === PASSWORD_STRENGTH_LEVEL.WEAK
        ? CHANGE_PASSWORD_ERROR_MESSAGE.PASSWORD_TOO_WEAK
        : undefined;

const validateConfirmPassword = (
  newPassword: string,
  confirmPassword: string,
): NullableUndefined<string> =>
  confirmPassword.length === 0
    ? CHANGE_PASSWORD_ERROR_MESSAGE.CONFIRM_REQUIRED
    : confirmPassword !== newPassword
      ? CHANGE_PASSWORD_ERROR_MESSAGE.PASSWORDS_MISMATCH
      : undefined;

// Un campo válido queda en undefined. Para saber si hay errores usar hasChangePasswordErrors.
export const validateChangePasswordForm = (
  values: ChangePasswordFormValues,
): ChangePasswordFormErrors => ({
  [CHANGE_PASSWORD_FIELD.CONFIRM_PASSWORD]: validateConfirmPassword(
    values.newPassword,
    values.confirmPassword,
  ),
  [CHANGE_PASSWORD_FIELD.NEW_PASSWORD]: validateNewPassword(values.newPassword),
});

export const hasChangePasswordErrors = (errors: ChangePasswordFormErrors): boolean =>
  Object.values(errors).some((message) => message !== undefined);

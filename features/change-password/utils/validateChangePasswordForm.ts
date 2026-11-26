import { NEW_PASSWORD_ERROR_MESSAGE, NEW_PASSWORD_FIELD } from "@/constants";
import type { NewPasswordFormErrors } from "@/types/new-password.types";
import { validateNewPasswordForm } from "@/utils/validateNewPasswordForm";
import {
  CHANGE_PASSWORD_ERROR_MESSAGE,
  CHANGE_PASSWORD_FIELD,
} from "../constants/change-password.constants";
import type { ChangePasswordFormValues } from "../models/ChangePasswordParams.interface";

export type ChangePasswordFormErrors = NewPasswordFormErrors & {
  currentPassword?: string;
};

/** La nueva contraseña escrita es la misma que la actual. Con la nueva vacía no cuenta: eso lo dice "obligatoria". */
export const isSameAsCurrentPassword = (values: ChangePasswordFormValues): boolean =>
  values.newPassword.length > 0 && values.newPassword === values.currentPassword;

/**
 * Errores del formulario de cambio de contraseña. Suma a las reglas de la nueva contraseña (las mismas que
 * el registro) que la actual sea obligatoria y que la nueva sea distinta de ella; si es igual, ese es el
 * mensaje de la nueva, antes que el de fortaleza. Un campo válido queda en undefined. Función pura.
 */
export const validateChangePasswordForm = (
  values: ChangePasswordFormValues,
): ChangePasswordFormErrors => {
  const newPasswordErrors = validateNewPasswordForm(values);

  return {
    ...newPasswordErrors,
    [CHANGE_PASSWORD_FIELD.CURRENT_PASSWORD]:
      values.currentPassword.length === 0
        ? CHANGE_PASSWORD_ERROR_MESSAGE.CURRENT_PASSWORD_REQUIRED
        : undefined,
    [NEW_PASSWORD_FIELD.NEW_PASSWORD]: isSameAsCurrentPassword(values)
      ? NEW_PASSWORD_ERROR_MESSAGE.SAME_PASSWORD
      : newPasswordErrors[NEW_PASSWORD_FIELD.NEW_PASSWORD],
  };
};

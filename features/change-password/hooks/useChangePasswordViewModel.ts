import { useState } from "react";
import type { FormEvent } from "react";
import { NEW_PASSWORD_FIELD } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { evaluatePasswordStrength } from "@/utils/password.utils";
import { hasNewPasswordErrors } from "@/utils/validateNewPasswordForm";
import {
  CHANGE_PASSWORD_RESULT,
  CHANGE_PASSWORD_RESULT_MESSAGE,
  CHANGE_PASSWORD_STATUS,
} from "../constants/change-password.constants";
import type { ChangePasswordStatusType } from "../constants/change-password.constants";
import type { ChangePasswordFormValues } from "../models/ChangePasswordParams.interface";
import type {
  ChangePasswordFieldType,
  ChangePasswordViewModel,
} from "../models/ChangePasswordViewModel.interface";
import { changePassword } from "../services/change-password.service";
import { isSameAsCurrentPassword, validateChangePasswordForm } from "../utils/validateChangePasswordForm";

const INITIAL_VALUES: ChangePasswordFormValues = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
};

export const useChangePasswordViewModel = (): ChangePasswordViewModel => {
  const [values, setValues] = useState<ChangePasswordFormValues>(INITIAL_VALUES);
  const [status, setStatus] = useState<ChangePasswordStatusType>(CHANGE_PASSWORD_STATUS.IDLE);
  const [currentPasswordError, setCurrentPasswordError] = useState<NullableUndefined<string>>(undefined);
  const [submitError, setSubmitError] = useState<NullableUndefined<string>>(undefined);

  const isSaving = status === CHANGE_PASSWORD_STATUS.SAVING;

  // Se calculan en cada render (no son estado): cambian solos al escribir.
  const validationErrors = validateChangePasswordForm(values);
  const hasErrors = hasNewPasswordErrors(validationErrors) || validationErrors.currentPassword !== undefined;
  const passwordStrength =
    values.newPassword.length > 0 ? evaluatePasswordStrength(values.newPassword) : undefined;
  // Los requisitos de la nueva contraseña los lista el medidor; aquí solo se avisa lo que él no dice.
  const newPasswordError = isSameAsCurrentPassword(values)
    ? validationErrors[NEW_PASSWORD_FIELD.NEW_PASSWORD]
    : undefined;
  const confirmPasswordError =
    values.confirmPassword.length > 0 ? validationErrors[NEW_PASSWORD_FIELD.CONFIRM_PASSWORD] : undefined;

  // Al escribir se descartan la confirmación y los fallos del intento anterior (no toca `saving`).
  const handleChange =
    (field: ChangePasswordFieldType) =>
    (value: string): void => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setCurrentPasswordError(undefined);
      setSubmitError(undefined);
      setStatus((previous) => (previous === CHANGE_PASSWORD_STATUS.SAVING ? previous : CHANGE_PASSWORD_STATUS.IDLE));
    };

  const save = async (): Promise<void> => {
    setStatus(CHANGE_PASSWORD_STATUS.SAVING);
    setCurrentPasswordError(undefined);
    setSubmitError(undefined);

    // El servicio no lanza: devuelve el resultado y acá se decide qué mostrar.
    const result = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });

    if (result === CHANGE_PASSWORD_RESULT.SUCCESS) {
      // Recién ahora se vacían los campos: mientras guarda el formulario sigue a la vista, no debe verse vacío.
      setValues(INITIAL_VALUES);
      setStatus(CHANGE_PASSWORD_STATUS.SAVED);
      return;
    }

    setStatus(CHANGE_PASSWORD_STATUS.IDLE);
    const message = CHANGE_PASSWORD_RESULT_MESSAGE[result];
    if (result === CHANGE_PASSWORD_RESULT.WRONG_CURRENT_PASSWORD) {
      setCurrentPasswordError(message);
      return;
    }
    setSubmitError(message);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    return !hasErrors && !isSaving ? await save() : undefined;
  };

  return {
    confirmPasswordError,
    currentPasswordError,
    handleChange,
    handleSubmit,
    isSaveDisabled: hasErrors || isSaving,
    isSaving,
    newPasswordError,
    passwordStrength,
    status,
    submitError,
    values,
  };
};

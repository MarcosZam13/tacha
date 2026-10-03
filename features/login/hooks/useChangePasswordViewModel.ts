import { useState } from "react";
import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import { evaluatePasswordStrength } from "@/utils/password.utils";
import {
  CHANGE_PASSWORD_FIELD,
  CHANGE_PASSWORD_STEP,
  PASSWORD_UPDATE_RESULT,
  PASSWORD_UPDATE_RESULT_MESSAGE,
} from "../constants/login.constants";
import type {
  ChangePasswordFieldType,
  ChangePasswordStepType,
  PasswordUpdateResultType,
} from "../constants/login.constants";
import type { ChangePasswordFormValues } from "../models/ChangePasswordFormValues.interface";
import type { ChangePasswordViewModel } from "../models/ChangePasswordViewModel.interface";
import { updateUserPassword } from "../services/password.service";
import {
  hasChangePasswordErrors,
  validateChangePasswordForm,
} from "../utils/validateChangePasswordForm";

const INITIAL_VALUES: ChangePasswordFormValues = { confirmPassword: "", newPassword: "" };

export const useChangePasswordViewModel = (): ChangePasswordViewModel => {
  const [step, setStep] = useState<ChangePasswordStepType>(CHANGE_PASSWORD_STEP.NOTICE);
  const [values, setValues] = useState<ChangePasswordFormValues>(INITIAL_VALUES);
  const [submitError, setSubmitError] = useState<NullableUndefined<string>>(undefined);

  const isSaving = step === CHANGE_PASSWORD_STEP.SAVING;

  // Se calculan en cada render (no son estado): cambian solos al escribir.
  const validationErrors = validateChangePasswordForm(values);
  const passwordStrength =
    values.newPassword.length > 0 ? evaluatePasswordStrength(values.newPassword) : undefined;
  // Los requisitos de la nueva contraseña los lista el medidor; aquí solo se avisa si no coinciden.
  const confirmPasswordError =
    values.confirmPassword.length > 0
      ? validationErrors[CHANGE_PASSWORD_FIELD.CONFIRM_PASSWORD]
      : undefined;

  // Al escribir se limpia el error general del intento anterior.
  const handleChange =
    (field: ChangePasswordFieldType) =>
    (value: string): void => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setSubmitError(undefined);
    };

  const handleOpenForm = (): void => setStep(CHANGE_PASSWORD_STEP.FORM);

  const handleBackToNotice = (): void => {
    setValues(INITIAL_VALUES);
    setSubmitError(undefined);
    setStep(CHANGE_PASSWORD_STEP.NOTICE);
  };

  const savePassword = async (): Promise<void> => {
    setStep(CHANGE_PASSWORD_STEP.SAVING);
    setSubmitError(undefined);

    const result = await updateUserPassword(values.newPassword).catch(
      (): PasswordUpdateResultType => PASSWORD_UPDATE_RESULT.ERROR,
    );

    const isSuccess = result === PASSWORD_UPDATE_RESULT.SUCCESS;
    setStep(isSuccess ? CHANGE_PASSWORD_STEP.DONE : CHANGE_PASSWORD_STEP.FORM);
    setSubmitError(PASSWORD_UPDATE_RESULT_MESSAGE[result]);
    // La contraseña nueva no debe quedar en memoria una vez guardada.
    if (isSuccess) setValues(INITIAL_VALUES);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    return !hasChangePasswordErrors(validationErrors) && !isSaving
      ? await savePassword()
      : undefined;
  };

  return {
    confirmPasswordError,
    handleBackToNotice,
    handleChange,
    handleOpenForm,
    handleSubmit,
    isSaveDisabled: hasChangePasswordErrors(validationErrors) || isSaving,
    isSaving,
    passwordStrength,
    step,
    submitError,
    values,
  };
};

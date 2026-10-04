import { useState } from "react";
import type { FormEvent } from "react";
import { registerUser } from "../services/registro.service";
import type { NullableUndefined } from "@/types/nullable.types";
import {
  REGISTRO_FIELD,
  REGISTER_RESULT,
  REGISTRO_RESULT_MESSAGE,
  REGISTRO_SUBMIT_STATUS,
} from "../constants/registro.constants";
import type {
  RegisterResultType,
  RegistroFieldType,
  RegistroSubmitStatusType,
} from "../constants/registro.constants";
import type { RegistroFormErrors, RegistroFormValues } from "../models/RegistroFormValues.interface";
import type { RegistroManualViewModel } from "../models/RegistroManualViewModel.interface";
import { normalizeEmail } from "@/utils/email.utils";
import { evaluatePasswordStrength } from "@/utils/password.utils";
import {
  hasRegistroErrors,
  isRegistroFormComplete,
  validateRegistroForm,
  validatePasswordsMatch,
} from "../utils/validateRegistroForm";

const INITIAL_VALUES: RegistroFormValues = {
  confirmPassword: "",
  email: "",
  name: "",
  password: "",
};

export const useRegistroManualViewModel = (): RegistroManualViewModel => {
  const [values, setValues] = useState<RegistroFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<RegistroFormErrors>({});
  const [status, setStatus] = useState<RegistroSubmitStatusType>(REGISTRO_SUBMIT_STATUS.IDLE);
  const [submitError, setSubmitError] = useState<NullableUndefined<string>>(undefined);
  const [isAcceptedTerms, setIsAcceptedTerms] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);

  const isSubmitting = status === REGISTRO_SUBMIT_STATUS.SUBMITTING;

  // Se calcula en cada render (no es estado). Sin contraseña no hay nada que mostrar.
  const passwordStrength =
    values.password.length > 0 ? evaluatePasswordStrength(values.password) : undefined;
  // Se calcula en cada render (no es estado): si cambia cualquiera de las dos contraseñas, el error aparece o desaparece solo.
  const passwordsMismatchError = validatePasswordsMatch(values.password, values.confirmPassword);

  const hasPasswordMismatch = passwordsMismatchError !== undefined;

  const visibleErrors: RegistroFormErrors = {
    ...errors,
    [REGISTRO_FIELD.CONFIRM_PASSWORD]:
      passwordsMismatchError ?? errors[REGISTRO_FIELD.CONFIRM_PASSWORD],
  };

  // Al escribir en un campo se limpia solo el error de ese campo.
  const handleChange =
    (field: RegistroFieldType) =>
    (value: string): void => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    };
  
  const handleAcceptedTermsChange = (isChecked: boolean): void => {
    setIsAcceptedTerms(isChecked);
  };

  const handleTermsModalOpen = (): void => {
    setIsTermsModalOpen(true);
  };

  const handleTermsModalClose = (): void => {
    setIsTermsModalOpen(false);
  };

  const submitRegistration = async (): Promise<void> => {
    setStatus(REGISTRO_SUBMIT_STATUS.SUBMITTING);
    setSubmitError(undefined);

    const result = await registerUser({
      email: normalizeEmail(values.email),
      name: values.name.trim(),
      password: values.password,
    }).catch((): RegisterResultType => REGISTER_RESULT.ERROR);

    setStatus(
      result === REGISTER_RESULT.SUCCESS
        ? REGISTRO_SUBMIT_STATUS.SUCCESS
        : REGISTRO_SUBMIT_STATUS.ERROR,
    );
    setSubmitError(REGISTRO_RESULT_MESSAGE[result]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateRegistroForm(values);
    setErrors(validationErrors);

    const canSubmit = !hasRegistroErrors(validationErrors) && !isSubmitting;
    return canSubmit ? await submitRegistration() : undefined;
  };

  return {
    errors: visibleErrors,
    handleAcceptedTermsChange,
    handleChange,
    handleSubmit,
    handleTermsModalClose,
    handleTermsModalOpen,
    isAcceptedTerms,
    isSubmitDisabled: !isRegistroFormComplete(values) || isSubmitting || hasPasswordMismatch || !isAcceptedTerms,
    isSubmitting,
    isSuccess: status === REGISTRO_SUBMIT_STATUS.SUCCESS,
    isTermsModalOpen,
    passwordStrength,
    registeredEmail: normalizeEmail(values.email),
    submitError,
    values,
  };
};
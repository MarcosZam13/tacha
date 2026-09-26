import { useState } from "react";
import type { FormEvent } from "react";
import { registerUser } from "../services/registro.service";
import type { NullableUndefined } from "@/types/nullable.types";
import {
    REGISTER_RESULT,
  REGISTRO_RESULT_MESSAGE,
  REGISTRO_SUBMIT_STATUS,
} from "../constants/registro.constants";
import type {
  RegistroFieldType,
  RegistroSubmitStatusType,
} from "../constants/registro.constants";
import type { RegistroFormErrors, RegistroFormValues } from "../models/RegistroFormValues.interface";
import type { RegistroManualViewModel } from "../models/RegistroManualViewModel.interface";
import {
  hasRegistroErrors,
  isRegistroFormComplete,
  normalizeRegistroEmail,
  validateRegistroForm,
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

  const isSubmitting = status === REGISTRO_SUBMIT_STATUS.SUBMITTING;

  // Al escribir en un campo se limpia solo el error de ese campo.
  const handleChange =
    (field: RegistroFieldType) =>
    (value: string): void => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    };

  const submitRegistration = async (): Promise<void> => {
    setStatus(REGISTRO_SUBMIT_STATUS.SUBMITTING);
    setSubmitError(undefined);

    const result = await registerUser({
      email: normalizeRegistroEmail(values.email),
      name: values.name.trim(),
      password: values.password,
    });

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
    errors,
    handleChange,
    handleSubmit,
    isSubmitDisabled: !isRegistroFormComplete(values) || isSubmitting,
    isSubmitting,
    isSuccess: status === REGISTRO_SUBMIT_STATUS.SUCCESS,
    submitError,
    values,
  };
};
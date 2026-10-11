import { useState } from "react";
import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import { normalizeEmail } from "@/utils/email.utils";
import {
  FORGOT_PASSWORD_ERROR_MESSAGE,
  FORGOT_PASSWORD_STATUS,
  RECOVERY_REQUEST_RESULT,
} from "../constants/password-recovery.constants";
import type { ForgotPasswordStatusType } from "../constants/password-recovery.constants";
import type { ForgotPasswordViewModel } from "../models/ForgotPasswordViewModel.interface";
import { requestPasswordReset } from "../services/password-recovery.service";
import { validateForgotPasswordEmail } from "../utils/validateForgotPasswordEmail";

export const useForgotPasswordViewModel = (): ForgotPasswordViewModel => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<ForgotPasswordStatusType>(FORGOT_PASSWORD_STATUS.IDLE);

  const isSubmitting = status === FORGOT_PASSWORD_STATUS.SUBMITTING;

  // Se calculan en cada render (no son estado): cambian solos al escribir o al cambiar `status`.
  const validationError = validateForgotPasswordEmail(email);
  // Con el campo vacío (o solo espacios) no se muestra error: el botón queda deshabilitado, como en el login.
  const emailError = normalizeEmail(email).length > 0 ? validationError : undefined;
  const submitError: NullableUndefined<string> =
    status === FORGOT_PASSWORD_STATUS.ERROR ? FORGOT_PASSWORD_ERROR_MESSAGE.UNEXPECTED : undefined;

  // Al escribir se limpia el fallo del intento anterior; no se toca `submitting` ni `sent`.
  const handleChange = (value: string): void => {
    setEmail(value);
    setStatus((previous) =>
      previous === FORGOT_PASSWORD_STATUS.ERROR ? FORGOT_PASSWORD_STATUS.IDLE : previous,
    );
  };

  const handleUseAnotherEmail = (): void => {
    setEmail("");
    setStatus(FORGOT_PASSWORD_STATUS.IDLE);
  };

  const sendRequest = async (): Promise<void> => {
    setStatus(FORGOT_PASSWORD_STATUS.SUBMITTING);

    // El servicio no lanza. "Sin cuenta" y el límite de envíos llegan acá como `sent`: la pantalla no
    // puede distinguirlos, y no debe (revelaría si el correo tiene cuenta).
    const result = await requestPasswordReset(normalizeEmail(email));

    setStatus(
      result === RECOVERY_REQUEST_RESULT.SENT
        ? FORGOT_PASSWORD_STATUS.SENT
        : FORGOT_PASSWORD_STATUS.ERROR,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    return validationError === undefined && !isSubmitting ? await sendRequest() : undefined;
  };

  return {
    email,
    emailError,
    handleChange,
    handleSubmit,
    handleUseAnotherEmail,
    isSubmitDisabled: validationError !== undefined || isSubmitting,
    isSubmitting,
    status,
    submitError,
  };
};

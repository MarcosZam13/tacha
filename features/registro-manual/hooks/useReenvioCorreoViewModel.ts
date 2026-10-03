import { useState } from "react";
import type { FormEvent } from "react";
import { resendVerificationEmail } from "../services/registro.service";
import type { NullableUndefined } from "@/types/nullable.types";
import {
  RESEND_MESSAGE,
  RESEND_RESULT,
  VERIFICATION_LABEL,
} from "../constants/registro.constants";
import type { ResendResultType } from "../constants/registro.constants";
import type { ReenvioCorreoViewModel } from "../models/ReenvioCorreoViewModel.interface";
import { normalizeEmail } from "@/utils/email.utils";
import { validateEmail } from "../utils/validateRegistroForm";

export const useReenvioCorreoViewModel = (): ReenvioCorreoViewModel => {
  const [email, setEmail] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<NullableUndefined<string>>(undefined);
  const [feedbackMessage, setFeedbackMessage] = useState<NullableUndefined<string>>(undefined);
  const [isSending, setIsSending] = useState<boolean>(false);

  const handleEmailChange = (value: string): void => {
    setEmail(value);
    setErrorMessage(undefined);
  };

  const sendEmail = async (): Promise<void> => {
    setIsSending(true);
    setFeedbackMessage(undefined);

    const result = await resendVerificationEmail(normalizeEmail(email)).catch(
      (): ResendResultType => RESEND_RESULT.ERROR,
    );

    setFeedbackMessage(RESEND_MESSAGE[result]);
    setIsSending(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationError = validateEmail(email);
    setErrorMessage(validationError);

    return validationError === undefined && !isSending ? await sendEmail() : undefined;
  };

  return {
    email,
    errorMessage,
    feedbackMessage,
    handleEmailChange,
    handleSubmit,
    isSubmitDisabled: email.length === 0 || isSending,
    submitLabel: isSending ? VERIFICATION_LABEL.RESENDING : VERIFICATION_LABEL.RESEND,
  };
};
import { useState } from "react";
import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import { normalizeEmail } from "@/utils/email.utils";
import {
  CONTACT_ERROR_MESSAGE,
  CONTACT_RESULT,
  CONTACT_RESULT_MESSAGE,
  CONTACT_SUBMIT_STATUS,
} from "../constants/contact.constants";
import type {
  ContactFieldType,
  ContactSourceType,
  ContactSubmitStatusType,
} from "../constants/contact.constants";
import type { ContactFormErrors, ContactFormValues } from "../models/ContactFormValues.interface";
import type { ContactFormViewModel } from "../models/ContactFormViewModel.interface";
import { submitContactMessage } from "../services/contact.service";
import { hasContactErrors, validateContactForm } from "../utils/validateContactForm";

const INITIAL_VALUES: ContactFormValues = { email: "", message: "", name: "" };

export const useContactFormViewModel = (source: ContactSourceType): ContactFormViewModel => {
  const [values, setValues] = useState<ContactFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [status, setStatus] = useState<ContactSubmitStatusType>(CONTACT_SUBMIT_STATUS.IDLE);
  const [submitError, setSubmitError] = useState<NullableUndefined<string>>(undefined);
  const [captchaToken, setCaptchaToken] = useState<NullableUndefined<string>>(undefined);
  const [captchaResetCount, setCaptchaResetCount] = useState(0);
  const [isCaptchaMissing, setIsCaptchaMissing] = useState(false);

  const isSubmitting = status === CONTACT_SUBMIT_STATUS.SUBMITTING;
  // Se calcula en cada render: desaparece solo en cuanto el widget entrega un token.
  const captchaError =
    isCaptchaMissing && captchaToken === undefined ? CONTACT_ERROR_MESSAGE.CAPTCHA_REQUIRED : undefined;

  // Al escribir en un campo se limpia solo el error de ese campo.
  const handleChange =
    (field: ContactFieldType) =>
    (value: string): void => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    };

  const sendMessage = async (token: string): Promise<void> => {
    setStatus(CONTACT_SUBMIT_STATUS.SUBMITTING);
    setSubmitError(undefined);

    // Viaja sin espacios en los extremos y con el correo en minúsculas: el límite de envíos
    // del servidor cuenta por correo, y "Ana@" y "ana@" son la misma persona.
    // El servicio no lanza: siempre devuelve un resultado.
    const result = await submitContactMessage({
      captchaToken: token,
      email: normalizeEmail(values.email),
      message: values.message.trim(),
      name: values.name.trim(),
      source,
    });
    const isSent = result === CONTACT_RESULT.SUCCESS;

    // Google acepta cada token una sola vez: se descarta y se pide uno nuevo, pase lo que pase.
    setCaptchaToken(undefined);
    setCaptchaResetCount((previous) => previous + 1);
    setStatus(isSent ? CONTACT_SUBMIT_STATUS.SUCCESS : CONTACT_SUBMIT_STATUS.ERROR);
    setSubmitError(CONTACT_RESULT_MESSAGE[result]);
    // Si falló, el texto se conserva para reintentar sin volver a escribirlo (CA-08).
    if (isSent) setValues(INITIAL_VALUES);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);
    setIsCaptchaMissing(captchaToken === undefined);

    return captchaToken !== undefined && !hasContactErrors(validationErrors) && !isSubmitting
      ? await sendMessage(captchaToken)
      : undefined;
  };

  const handleSendAnother = (): void => {
    setStatus(CONTACT_SUBMIT_STATUS.IDLE);
    setIsCaptchaMissing(false);
  };

  return {
    captchaError,
    captchaResetCount,
    errors,
    // El setter de useState es estable: el efecto del widget no se vuelve a correr en cada render.
    handleCaptchaTokenChange: setCaptchaToken,
    handleChange,
    handleSendAnother,
    handleSubmit,
    isSubmitting,
    isSuccess: status === CONTACT_SUBMIT_STATUS.SUCCESS,
    submitError,
    values,
  };
};

import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import type { ContactFieldType } from "../constants/contact.constants";
import type { ContactFormErrors, ContactFormValues } from "./ContactFormValues.interface";

export interface ContactFormViewModel {
  // Solo después de intentar enviar sin marcar la casilla; desaparece al marcarla.
  captchaError: NullableUndefined<string>;
  captchaResetCount: number;
  errors: ContactFormErrors;
  handleCaptchaTokenChange: (token: NullableUndefined<string>) => void;
  handleChange: (field: ContactFieldType) => (value: string) => void;
  handleSendAnother: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
  isSuccess: boolean;
  // El fallo del envío: reCAPTCHA rechazado, límite de envíos, servidor o red.
  submitError: NullableUndefined<string>;
  values: ContactFormValues;
}

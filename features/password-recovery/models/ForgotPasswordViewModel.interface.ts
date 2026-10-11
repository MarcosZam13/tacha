import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import type { ForgotPasswordStatusType } from "../constants/password-recovery.constants";

export interface ForgotPasswordViewModel {
  email: string;
  // Solo con algo escrito: un campo vacío no muestra error, deshabilita el botón.
  emailError: NullableUndefined<string>;
  handleChange: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleUseAnotherEmail: () => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  status: ForgotPasswordStatusType;
  // El fallo del envío (red o servidor). Nunca habla de la cuenta.
  submitError: NullableUndefined<string>;
}

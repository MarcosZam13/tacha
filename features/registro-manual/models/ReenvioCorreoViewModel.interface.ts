import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";

export interface ReenvioCorreoViewModel {
  email: string;
  errorMessage: NullableUndefined<string>;
  feedbackMessage: NullableUndefined<string>;
  handleEmailChange: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitDisabled: boolean;
  submitLabel: string;
}
import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";

export interface CompleteSignUpViewModel {
  handleNameChange: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleTermsAcceptedChange: (isChecked: boolean) => void;
  /** El formulario se ve mientras se puede editar y mientras guarda. */
  isFormVisible: boolean;
  isLoading: boolean;
  /** No hay un registro social en curso que completar. */
  isNoAccount: boolean;
  isSubmitDisabled: boolean;
  /** El checkbox de términos (SCRUM-44): empieza sin marcar. */
  isTermsAccepted: boolean;
  name: string;
  nameError: NullableUndefined<string>;
  saveError: NullableUndefined<string>;
  submitLabel: string;
}

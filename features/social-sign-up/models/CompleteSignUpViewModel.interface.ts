import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";

export interface CompleteSignUpViewModel {
  handleNameChange: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  /** El formulario se ve mientras se puede editar y mientras guarda. */
  isFormVisible: boolean;
  isLoading: boolean;
  /** No hay un registro social en curso que completar. */
  isNoAccount: boolean;
  isSubmitDisabled: boolean;
  name: string;
  nameError: NullableUndefined<string>;
  saveError: NullableUndefined<string>;
  submitLabel: string;
}

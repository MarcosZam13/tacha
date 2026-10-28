import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import type { PasswordStrength } from "@/types/password.types";
import type { RegistroFieldType } from "../constants/registro.constants";
import type { RegistroFormErrors, RegistroFormValues } from "./RegistroFormValues.interface";

export interface RegistroManualViewModel {
  errors: RegistroFormErrors;
  handleChange: (field: RegistroFieldType) => (value: string) => void;
  /** Al salir de un campo se valida ese campo (SCRUM-137, F5). */
  handleBlur: (field: RegistroFieldType) => () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleAcceptedTermsChange: (isChecked: boolean) => void;
  handleTermsModalClose: () => void;
  handleTermsModalOpen: () => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSuccess: boolean;
  isAcceptedTerms: boolean;
  isTermsModalOpen: boolean;
  passwordStrength: NullableUndefined<PasswordStrength>;
  registeredEmail: string;
  submitError: NullableUndefined<string>;
  values: RegistroFormValues;
}
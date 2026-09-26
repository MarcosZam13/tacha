import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import type { RegistroFieldType } from "../constants/registro.constants";
import type { RegistroFormErrors, RegistroFormValues } from "./RegistroFormValues.interface";

export interface RegistroManualViewModel {
  errors: RegistroFormErrors;
  handleChange: (field: RegistroFieldType) => (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSuccess: boolean;
  submitError: NullableUndefined<string>;
  values: RegistroFormValues;
}
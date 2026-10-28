import type { FormFieldStateType } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

export interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Al salir del campo (SCRUM-137): el registro valida ahí los campos obligatorios. */
  onBlur?: () => void;
  helperText?: NullableUndefined<string>;
  errorMessage?: NullableUndefined<string>;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number";
  isRequired?: boolean;
}

export interface InputFieldState {
  state: FormFieldStateType;
  message: NullableUndefined<string>;
}

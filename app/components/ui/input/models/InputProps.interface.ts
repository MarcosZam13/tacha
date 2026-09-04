import type { FormFieldStateType } from "@/app/constants";
import type { NullableUndefined } from "@/app/types/nullable.types";

export interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
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

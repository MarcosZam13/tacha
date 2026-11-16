import type { FormFieldStateType } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

/**
 * Atributos de combobox (SCRUM-149): el buscador de productos usa este mismo
 * campo con un desplegable de resultados. Opcionales; un Input común no los usa.
 */
export interface InputComboboxAttributes {
  "aria-activedescendant"?: string;
  "aria-autocomplete": "list";
  "aria-controls": string;
  "aria-expanded": boolean;
  onFocus: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  role: "combobox";
}

export interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Al salir del campo (SCRUM-137): el registro valida ahí los campos obligatorios. */
  onBlur?: () => void;
  helperText?: NullableUndefined<string>;
  errorMessage?: NullableUndefined<string>;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "date";
  isRequired?: boolean;
  combobox?: InputComboboxAttributes;
}

export interface InputFieldState {
  state: FormFieldStateType;
  message: NullableUndefined<string>;
}

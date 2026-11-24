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
  type?: "text" | "email" | "password" | "number" | "date";
  /**
   * Teclado del celular. "decimal" con type="text" en vez de type="number":
   * un campo number entrega "" cuando lo escrito no es un número ("-", "e"),
   * y un campo opcional lo confundiría con vacío (HU-57).
   */
  inputMode?: "text" | "decimal" | "numeric";
  isRequired?: boolean;
}

export interface InputFieldState {
  state: FormFieldStateType;
  message: NullableUndefined<string>;
}

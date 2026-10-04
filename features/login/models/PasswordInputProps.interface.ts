import type { NullableUndefined } from "@/types/nullable.types";
import type { AutocompleteType } from "../constants/login.constants";

export interface PasswordInputProps {
  autoComplete?: AutocompleteType;
  errorMessage: NullableUndefined<string>;
  isRequired?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}
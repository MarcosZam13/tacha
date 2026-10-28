import type { AutocompleteType } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

export interface PasswordInputProps {
  autoComplete?: AutocompleteType;
  errorMessage: NullableUndefined<string>;
  isRequired?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}
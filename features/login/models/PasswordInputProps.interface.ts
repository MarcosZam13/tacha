import type { NullableUndefined } from "@/types/nullable.types";

export interface PasswordInputProps {
  errorMessage: NullableUndefined<string>;
  isRequired?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}
import type { NullableUndefined } from "@/types/nullable.types";

export interface ContactMessageFieldProps {
  errorMessage?: NullableUndefined<string>;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

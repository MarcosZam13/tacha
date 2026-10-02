import type { NullableUndefined } from "@/types/nullable.types";

export interface StatCardProps {
  label: string;
  value: string;
  helperText?: NullableUndefined<string>;
}

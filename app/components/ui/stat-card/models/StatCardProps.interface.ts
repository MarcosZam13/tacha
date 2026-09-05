import type { NullableUndefined } from "@/app/types/nullable.types";

export interface StatCardProps {
  label: string;
  value: string;
  helperText?: NullableUndefined<string>;
}

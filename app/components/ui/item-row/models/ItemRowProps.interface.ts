import type { NullableUndefined } from "@/app/types/nullable.types";

export interface ItemRowProps {
  isChecked: boolean;
  onToggle: () => void;
  name: string;
  meta?: NullableUndefined<string>;
  badge?: NullableUndefined<React.ReactNode>;
}

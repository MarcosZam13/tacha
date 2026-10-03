import type { NullableUndefined } from "@/types/nullable.types";

export interface RecaptchaWidgetProps {
  onTokenChange: (token: NullableUndefined<string>) => void;
  resetCount: number;
}
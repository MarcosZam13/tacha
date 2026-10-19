import type { NullableRef } from "@/types/nullable.types";

export interface RecaptchaWidgetViewModel {
  containerRef: React.RefObject<NullableRef<HTMLDivElement>>;
  hasLoadError: boolean;
}

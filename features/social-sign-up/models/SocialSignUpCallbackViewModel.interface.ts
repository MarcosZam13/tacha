import type { NullableUndefined } from "@/types/nullable.types";
import type { SocialSignUpFeedback } from "./SocialSignUpFeedback.interface";

export interface SocialSignUpCallbackViewModel {
  feedback: NullableUndefined<SocialSignUpFeedback>;
}

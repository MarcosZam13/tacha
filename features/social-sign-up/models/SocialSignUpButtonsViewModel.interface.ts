import type { NullableUndefined } from "@/types/nullable.types";
import type { SocialProviderType } from "../constants/social-sign-up.constants";

export interface SocialSignUpButtonsViewModel {
  errorMessage: NullableUndefined<string>;
  handleProviderClick: (provider: SocialProviderType) => () => Promise<void>;
  isDisabled: boolean;
}


import { useEffect, useState } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import {
  SOCIAL_SIGN_UP_LABEL,
  SOCIAL_SIGN_UP_STATUS,
} from "../constants/social-sign-up.constants";
import type {
  SocialProviderType,
  SocialSignUpResultType,
} from "../constants/social-sign-up.constants";
import type { SocialSignUpButtonsViewModel } from "../models/SocialSignUpButtonsViewModel.interface";
import { startSocialSignUp } from "../services/social-sign-up.service";

export const useSocialSignUpButtonsViewModel = (): SocialSignUpButtonsViewModel => {
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<NullableUndefined<string>>(undefined);

  // Al volver con "atrás" desde el proveedor, el navegador puede restaurar la página tal como quedó.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) setIsRedirecting(false);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleProviderClick = (provider: SocialProviderType) => async (): Promise<void> => {
    setIsRedirecting(true);
    setErrorMessage(undefined);

    const result = await startSocialSignUp(provider).catch(
      (): SocialSignUpResultType => SOCIAL_SIGN_UP_STATUS.ERROR,
    );

    if (result === SOCIAL_SIGN_UP_STATUS.SUCCESS) return;

    setErrorMessage(SOCIAL_SIGN_UP_LABEL.START_ERROR);
    setIsRedirecting(false);
  };

  return { errorMessage, handleProviderClick, isDisabled: isRedirecting };
};

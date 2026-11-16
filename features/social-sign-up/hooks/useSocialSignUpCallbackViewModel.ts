import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTE } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";
import {
  SOCIAL_SIGN_UP_FEEDBACK,
  SOCIAL_SIGN_UP_STATUS,
} from "../constants/social-sign-up.constants";
import type {
  SocialSignUpResultType,
  SocialSignUpStatusType,
} from "../constants/social-sign-up.constants";
import type { SocialSignUpCallbackViewModel } from "../models/SocialSignUpCallbackViewModel.interface";
import { completeSocialSignUp } from "../services/social-sign-up.service";

export const useSocialSignUpCallbackViewModel = (): SocialSignUpCallbackViewModel => {
  const router = useRouter();
  const [status, setStatus] = useState<SocialSignUpStatusType>(SOCIAL_SIGN_UP_STATUS.CHECKING);
  // En desarrollo React corre el efecto dos veces; la marca del flujo solo se puede consumir una.
  const pendingResult = useRef<NullableRef<Promise<SocialSignUpResultType>>>(null);

  useEffect(() => {
    let isCancelled = false;

    pendingResult.current ??= completeSocialSignUp().catch(
      (): SocialSignUpResultType => SOCIAL_SIGN_UP_STATUS.ERROR,
    );

    void pendingResult.current.then((result) => {
      if (isCancelled) return;

      setStatus(result);
      // replace y no push: con push, "atrás" volvería a esta página y mostraría un error.
      if (result === SOCIAL_SIGN_UP_STATUS.SUCCESS) router.replace(APP_ROUTE.LIST);
    });

    return () => {
      isCancelled = true;
    };
  }, [router]);

  return { feedback: SOCIAL_SIGN_UP_FEEDBACK[status] };
};

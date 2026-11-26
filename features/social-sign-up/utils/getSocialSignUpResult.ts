import type { User } from "@supabase/supabase-js";
import {
  SOCIAL_SIGN_UP_COMPLETED_KEY,
  SOCIAL_SIGN_UP_STATUS,
} from "../constants/social-sign-up.constants";
import type { SocialSignUpResultType } from "../constants/social-sign-up.constants";

// Supabase no da error si el correo ya existe: vincula la identidad e inicia sesión. Por eso el
// duplicado se reconoce por sus datos: otra identidad en la cuenta, o el registro social ya completado.
export const getSocialSignUpResult = (user: User): SocialSignUpResultType => {
  if (user.is_anonymous || !user.email) return SOCIAL_SIGN_UP_STATUS.ERROR;

  const hasOtherIdentity = (user.identities?.length ?? 0) > 1;
  const hasCompletedSignUp = Boolean(user.user_metadata[SOCIAL_SIGN_UP_COMPLETED_KEY]);

  return hasOtherIdentity || hasCompletedSignUp
    ? SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS
    : SOCIAL_SIGN_UP_STATUS.SUCCESS;
};

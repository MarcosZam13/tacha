import type { User } from "@supabase/supabase-js";
import { toUserProfile } from "@/utils/toUserProfile";
import {
  COMPLETE_SIGN_UP_ACCOUNT_STATUS,
  NO_COMPLETE_SIGN_UP_ACCOUNT,
} from "../constants/complete-sign-up.constants";
import type { CompleteSignUpAccount } from "../models/CompleteSignUpAccount.interface";
import { isSocialSignUpPending } from "./isSocialSignUpPending";

/**
 * Decide qué hace /registro/completar con la cuenta (SCRUM-43). Solo una cuenta social
 * que todavía no completó el registro ve el formulario; una cuenta de correo, o una que
 * ya lo completó, no tiene nada que completar.
 */
export const toCompleteSignUpAccount = (user: User): CompleteSignUpAccount => {
  if (user.is_anonymous || !user.email) return NO_COMPLETE_SIGN_UP_ACCOUNT;

  return {
    name: toUserProfile(user).name ?? "",
    status: isSocialSignUpPending(user)
      ? COMPLETE_SIGN_UP_ACCOUNT_STATUS.PENDING
      : COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED,
  };
};

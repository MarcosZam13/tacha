import type { User } from "@supabase/supabase-js";
import { AUTH_ROUTE } from "@/constants";
import { signOutUser } from "@/services/session.service";
import { getSupabaseClient } from "@/services/supabase.client";
import { COMPLETE_SIGN_UP_ACCOUNT_STATUS } from "../constants/complete-sign-up.constants";
import {
  SOCIAL_SIGN_UP_PENDING_KEY,
  SOCIAL_SIGN_UP_STATUS,
} from "../constants/social-sign-up.constants";
import type {
  SocialProviderType,
  SocialSignUpResultType,
} from "../constants/social-sign-up.constants";
import { getSocialSignUpResult } from "../utils/getSocialSignUpResult";
import { hasProviderError } from "../utils/hasProviderError";
import { getCompleteSignUpAccount } from "./complete-sign-up.service";

// Con éxito, el navegador sale hacia el proveedor. La URL de retorno debe estar en las Redirect URLs de Supabase.
export const startSocialSignUp = async (
  provider: SocialProviderType,
): Promise<SocialSignUpResultType> => {
  window.sessionStorage.setItem(SOCIAL_SIGN_UP_PENDING_KEY, provider);

  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}${AUTH_ROUTE.SOCIAL_SIGN_UP}` },
  });

  if (!error) return SOCIAL_SIGN_UP_STATUS.SUCCESS;

  window.sessionStorage.removeItem(SOCIAL_SIGN_UP_PENDING_KEY);
  return SOCIAL_SIGN_UP_STATUS.ERROR;
};

// Revierte la vinculación automática de Supabase. Si falla, se sigue: el aviso y el cierre de sesión
// no dependen de esto, y la identidad solo quedaría como otra forma de entrar a la misma cuenta.
const unlinkNewIdentity = async (user: User, provider: string): Promise<void> => {
  const identity = user.identities?.find((item) => item.provider === provider);
  const hasOtherIdentity = (user.identities?.length ?? 0) > 1;

  if (identity && hasOtherIdentity) await getSupabaseClient().auth.unlinkIdentity(identity);
};

// Sin la marca del flujo, esta página no se abrió desde los botones (o se volvió a ella con "atrás"
// desde el formulario): nunca se toca la sesión que tenga la persona. Si esa sesión es de una cuenta
// social que todavía no completó el registro, sigue al formulario (SCRUM-43); si no, es un error.
const resumePendingSignUp = async (): Promise<SocialSignUpResultType> => {
  const account = await getCompleteSignUpAccount();

  return account.status === COMPLETE_SIGN_UP_ACCOUNT_STATUS.PENDING
    ? SOCIAL_SIGN_UP_STATUS.SUCCESS
    : SOCIAL_SIGN_UP_STATUS.ERROR;
};

// Si el proveedor falló, no se toca la sesión: la que haya no viene de este flujo.
// Una cuenta nueva conserva la sesión y sigue al formulario de /registro/completar, que guarda
// el nombre y la marca de registro completado (SCRUM-43).
export const completeSocialSignUp = async (): Promise<SocialSignUpResultType> => {
  const provider = window.sessionStorage.getItem(SOCIAL_SIGN_UP_PENDING_KEY);
  window.sessionStorage.removeItem(SOCIAL_SIGN_UP_PENDING_KEY);

  // Sin la marca va primero: al volver con "atrás", el proveedor puede repetir una autorización vieja
  // y Supabase vuelve con ?error=..., aunque la sesión de la cuenta nueva siga abierta.
  if (!provider) return await resumePendingSignUp();
  if (hasProviderError(window.location.search, window.location.hash)) return SOCIAL_SIGN_UP_STATUS.ERROR;

  const auth = getSupabaseClient().auth;
  const { data: userData, error } = await auth.getUser();
  if (error || !userData.user) return SOCIAL_SIGN_UP_STATUS.ERROR;

  const result = getSocialSignUpResult(userData.user);
  if (result === SOCIAL_SIGN_UP_STATUS.SUCCESS) return result;

  if (result === SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS) {
    await unlinkNewIdentity(userData.user, provider);
  }

  if (!userData.user.is_anonymous) await signOutUser();

  return result;
};

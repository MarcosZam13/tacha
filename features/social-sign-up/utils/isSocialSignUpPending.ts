import type { User } from "@supabase/supabase-js";
import { USER_METADATA_KEY } from "@/constants";
import { SOCIAL_PROVIDER, SOCIAL_SIGN_UP_COMPLETED_KEY } from "../constants/social-sign-up.constants";

const SOCIAL_PROVIDERS: readonly string[] = Object.values(SOCIAL_PROVIDER);

/**
 * Una cuenta creada con Google o Facebook que todavía no envió el formulario de
 * /registro/completar (SCRUM-43). `app_metadata.provider` lo fija el servidor; la marca
 * vive en `user_metadata` y la persona la puede editar, así que esto decide qué pantalla
 * se ve, nunca permisos sobre los datos. Sin correo no hay registro que completar: el
 * formulario no la aceptaría y la persona quedaría sin salida. Sin los términos aceptados
 * (SCRUM-44) tampoco está completa, aunque alguien haya escrito solo la marca.
 */
export const isSocialSignUpPending = (
  user: Pick<User, "app_metadata" | "email" | "is_anonymous" | "user_metadata">,
): boolean => {
  const provider = user.app_metadata.provider;
  const isSocialAccount = typeof provider === "string" && SOCIAL_PROVIDERS.includes(provider);

  const hasCompletedSignUp =
    Boolean(user.user_metadata[SOCIAL_SIGN_UP_COMPLETED_KEY]) &&
    Boolean(user.user_metadata[USER_METADATA_KEY.TERMS_ACCEPTED_AT]);

  return !user.is_anonymous && Boolean(user.email) && isSocialAccount && !hasCompletedSignUp;
};

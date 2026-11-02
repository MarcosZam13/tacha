import { AUTH_ROUTE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import type { SocialSignUpFeedback } from "../models/SocialSignUpFeedback.interface";

export const SOCIAL_PROVIDER = {
  FACEBOOK: "facebook",
  GOOGLE: "google",
} as const;

export type SocialProviderType = (typeof SOCIAL_PROVIDER)[keyof typeof SOCIAL_PROVIDER];

// Orden visual de los botones.
export const SOCIAL_PROVIDER_OPTIONS = [
  { label: "Registrarse con Google", provider: SOCIAL_PROVIDER.GOOGLE },
  { label: "Registrarse con Facebook", provider: SOCIAL_PROVIDER.FACEBOOK },
] as const;

// CHECKING es el instante en que la página de retorno todavía está validando al usuario.
export const SOCIAL_SIGN_UP_STATUS = {
  CHECKING: "checking",
  EMAIL_EXISTS: "email-exists",
  ERROR: "error",
  SUCCESS: "success",
} as const;

export type SocialSignUpStatusType =
  (typeof SOCIAL_SIGN_UP_STATUS)[keyof typeof SOCIAL_SIGN_UP_STATUS];

export type SocialSignUpResultType = Exclude<
  SocialSignUpStatusType,
  typeof SOCIAL_SIGN_UP_STATUS.CHECKING
>;

export const SOCIAL_SIGN_UP_LABEL = {
  CHECKING: "Validando tu cuenta",
  PAGE_TITLE: "Registro con proveedor externo",
  START_ERROR: "No pudimos conectar con el proveedor. Intentá de nuevo.",
} as const;

const FAILED_SIGN_UP_FEEDBACK: SocialSignUpFeedback = {
  linkHref: AUTH_ROUTE.REGISTER,
  linkLabel: "Volver al registro",
  message:
    "Intentá de nuevo y revisá que tu cuenta del proveedor tenga un correo y que permitas compartirlo.",
  title: "No pudimos completar el registro",
};

const EMAIL_EXISTS_FEEDBACK: SocialSignUpFeedback = {
  linkHref: AUTH_ROUTE.LOGIN,
  linkLabel: "Iniciar sesión",
  message: "Este correo ya está registrado. Iniciá sesión en lugar de registrarte de nuevo.",
  title: "Ya tenés una cuenta",
};

// Sin aviso mientras se valida ni al éxito: ahí se muestra el spinner hasta redirigir.
export const SOCIAL_SIGN_UP_FEEDBACK: Record<
  SocialSignUpStatusType,
  NullableUndefined<SocialSignUpFeedback>
> = {
  [SOCIAL_SIGN_UP_STATUS.CHECKING]: undefined,
  [SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS]: EMAIL_EXISTS_FEEDBACK,
  [SOCIAL_SIGN_UP_STATUS.ERROR]: FAILED_SIGN_UP_FEEDBACK,
  [SOCIAL_SIGN_UP_STATUS.SUCCESS]: undefined,
};

// Parámetro con el que Supabase avisa en la URL de retorno que el flujo OAuth falló.
export const OAUTH_ERROR_PARAM = "error";

// Marca en sessionStorage de que este navegador inició el flujo, con el proveedor elegido.
export const SOCIAL_SIGN_UP_PENDING_KEY = "tacha-social-sign-up-pending";

// Clave en user_metadata de la fecha en que la cuenta completó el registro social.
// La persona puede editarla: solo decide qué aviso se muestra, nunca da permisos.
export const SOCIAL_SIGN_UP_COMPLETED_KEY = "social_sign_up_completed_at";

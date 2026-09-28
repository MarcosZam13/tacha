import { getSupabaseClient } from "@/services/supabase.client";
import {
  HTTP_STATUS,
  REGISTER_RESULT,
  REGISTRO_ROUTE,
  RESEND_RESULT,
  SUPABASE_AUTH_ERROR_CODE,
} from "../constants/registro.constants";
import type { RegisterResultType, ResendResultType } from "../constants/registro.constants";
import type { RegisterUserParams } from "../models/RegisterUserParams.interface";


// El enlace del correo tiene que volver a esta app. El origen se toma del navegador:
// localhost en desarrollo, el dominio real en producción. Debe estar en las Redirect URLs de Supabase.
const getVerificationRedirectUrl = (): string =>
  `${window.location.origin}${REGISTRO_ROUTE.VERIFIED}`;
// Devuelve un resultado, no lanza: el que llama decide qué mostrar.
// Con la confirmación de correo activa, Supabase no da error si el correo ya existe
// (para no revelar qué correos están registrados): devuelve un usuario sin identities.
export const registerUser = async ({
  email,
  name,
  password,
}: RegisterUserParams): Promise<RegisterResultType> => {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: getVerificationRedirectUrl() },
  });

  return error?.code === SUPABASE_AUTH_ERROR_CODE.USER_ALREADY_EXISTS ||
    data.user?.identities?.length === 0
    ? REGISTER_RESULT.EMAIL_EXISTS
    : error
      ? REGISTER_RESULT.ERROR
      : REGISTER_RESULT.SUCCESS;
};

// Devuelve un resultado, no lanza. Con el límite de Supabase (un correo por minuto por usuario,
// y el tope del proyecto) responde 429: se distingue para mostrar un mensaje propio.
export const resendVerificationEmail = async (email: string): Promise<ResendResultType> => {
  const { error } = await getSupabaseClient().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getVerificationRedirectUrl() },
  });

  return error?.status === HTTP_STATUS.TOO_MANY_REQUESTS
    ? RESEND_RESULT.RATE_LIMITED
    : error
      ? RESEND_RESULT.ERROR
      : RESEND_RESULT.SUCCESS;
};
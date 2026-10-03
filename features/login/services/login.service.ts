import { FunctionsHttpError } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableUndefined } from "@/types/nullable.types";
import {
  LOGIN_API_CODE_RESULT,
  LOGIN_FUNCTION,
  LOGIN_RESULT,
} from "../constants/login.constants";
import type { LoginResultType } from "../constants/login.constants";
import type {
  LoginFunctionError,
  LoginFunctionResponse,
} from "../models/LoginFunctionResponse.interface";
import type { LoginParams } from "../models/LoginParams.interface";

// En un error 4xx/5xx, supabase-js entrega la respuesta cruda en `error.context`.
const readErrorCode = async (error: unknown): Promise<NullableUndefined<string>> =>
  error instanceof FunctionsHttpError
    ? await error.context
        .json()
        .then((body: LoginFunctionError) => body.code)
        .catch(() => undefined)
    : undefined;

// Devuelve un resultado, no lanza: el que llama decide qué mostrar.
export const loginWithRecaptcha = async ({
  captchaToken,
  email,
  password,
}: LoginParams): Promise<LoginResultType> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<LoginFunctionResponse>(
    LOGIN_FUNCTION.NAME,
    { body: { captchaToken, email, password } },
  );

  if (error || !data) {
    const code = await readErrorCode(error);
    return (code && LOGIN_API_CODE_RESULT[code]) || LOGIN_RESULT.ERROR;
  }

  // La sesión se creó en el servidor; acá se guarda en el navegador (reemplaza la anónima).
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  return sessionError ? LOGIN_RESULT.ERROR : LOGIN_RESULT.SUCCESS;
};
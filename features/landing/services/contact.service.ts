import { FunctionsHttpError } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableUndefined } from "@/types/nullable.types";
import { CONTACT_API_CODE_RESULT, CONTACT_FUNCTION, CONTACT_RESULT } from "../constants/contact.constants";
import type { ContactResultType } from "../constants/contact.constants";
import type {
  SubmitContactMessageError,
  SubmitContactMessagePayload,
  SubmitContactMessageResponse,
} from "../models/SubmitContactMessage.interface";

// En un error 4xx/5xx, supabase-js entrega la respuesta cruda en `error.context`.
const readErrorCode = async (error: unknown): Promise<NullableUndefined<string>> =>
  error instanceof FunctionsHttpError
    ? await error.context
        .json()
        .then((body: SubmitContactMessageError) => body.code)
        .catch(() => undefined)
    : undefined;

/**
 * Manda el mensaje a la Edge Function, que verifica el reCAPTCHA con Google y recién ahí lo guarda.
 * Devuelve un resultado, no lanza: el que llama decide qué mostrar. Cualquier fallo sin un código
 * conocido (red, servidor, faltan las variables de Supabase) es un error genérico.
 */
export const submitContactMessage = async (
  payload: SubmitContactMessagePayload,
): Promise<ContactResultType> => {
  try {
    const { data, error } = await getSupabaseClient().functions.invoke<SubmitContactMessageResponse>(
      CONTACT_FUNCTION.NAME,
      { body: payload },
    );
    if (!error && data) return CONTACT_RESULT.SUCCESS;

    const code = await readErrorCode(error);
    return (code && CONTACT_API_CODE_RESULT[code]) || CONTACT_RESULT.ERROR;
  } catch {
    return CONTACT_RESULT.ERROR;
  }
};

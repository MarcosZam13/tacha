import { USER_METADATA_KEY } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import {
  COMPLETE_SIGN_UP_ACCOUNT_STATUS,
  COMPLETE_SIGN_UP_SAVE_RESULT,
  NO_COMPLETE_SIGN_UP_ACCOUNT,
} from "../constants/complete-sign-up.constants";
import type { CompleteSignUpSaveResultType } from "../constants/complete-sign-up.constants";
import { SOCIAL_SIGN_UP_COMPLETED_KEY } from "../constants/social-sign-up.constants";
import type { CompleteSignUpAccount } from "../models/CompleteSignUpAccount.interface";
import { toCompleteSignUpAccount } from "../utils/toCompleteSignUpAccount";

// La cuenta se valida con getUser(), contra el servidor, no con lo guardado en el navegador.
// getUser() no actualiza la sesión guardada, y la puerta de las pantallas privadas lee esa sesión:
// si el registro se completó en otro dispositivo, la puerta seguiría viendo la cuenta pendiente y
// las dos se mandarían de una a otra. Renovar la sesión la pone al día antes de entrar a la app.
export const getCompleteSignUpAccount = async (): Promise<CompleteSignUpAccount> => {
  const auth = getSupabaseClient().auth;
  const { data: userData, error } = await auth.getUser();
  if (error || !userData.user) return NO_COMPLETE_SIGN_UP_ACCOUNT;

  const account = toCompleteSignUpAccount(userData.user);
  if (account.status === COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED) {
    // Sin renovar, en el peor caso vuelve el bucle hasta que el token se renueve solo; no es motivo de error.
    await auth.refreshSession().catch(() => undefined);
  }

  return account;
};

// El nombre y la marca de registro completado se guardan en una sola llamada: si falla, la cuenta
// no queda con uno sin el otro. Devuelve un resultado, no lanza: el que llama decide qué mostrar.
export const saveCompletedSignUp = async (name: string): Promise<CompleteSignUpSaveResultType> => {
  const { error } = await getSupabaseClient().auth.updateUser({
    data: {
      [USER_METADATA_KEY.NAME]: name.trim(),
      [SOCIAL_SIGN_UP_COMPLETED_KEY]: new Date().toISOString(),
    },
  });

  return error ? COMPLETE_SIGN_UP_SAVE_RESULT.ERROR : COMPLETE_SIGN_UP_SAVE_RESULT.SUCCESS;
};

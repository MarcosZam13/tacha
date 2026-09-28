import { getSupabaseClient } from "@/services/supabase.client";
import { REGISTER_RESULT, SUPABASE_AUTH_ERROR_CODE } from "../constants/registro.constants";
import type { RegisterResultType } from "../constants/registro.constants";
import type { RegisterUserParams } from "../models/RegisterUserParams.interface";

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
    options: { data: { name } },
  });

  return error?.code === SUPABASE_AUTH_ERROR_CODE.USER_ALREADY_EXISTS ||
    data.user?.identities?.length === 0
    ? REGISTER_RESULT.EMAIL_EXISTS
    : error
      ? REGISTER_RESULT.ERROR
      : REGISTER_RESULT.SUCCESS;
};
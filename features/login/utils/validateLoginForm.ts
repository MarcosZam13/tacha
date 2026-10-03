import type { NullableUndefined } from "@/types/nullable.types";
import { REGISTRO_EMAIL_PATTERN } from "@/features/registro-manual/constants/registro.constants";
import { normalizeRegistroEmail } from "@/features/registro-manual/utils/validateRegistroForm";
import { LOGIN_ERROR_MESSAGE, LOGIN_FIELD } from "../constants/login.constants";
import type { LoginFormErrors, LoginFormValues } from "../models/LoginFormValues.interface";

// Habilita el botón: todo campo con algo escrito.
export const isLoginFormComplete = (values: LoginFormValues): boolean =>
  values.email.length > 0 && values.password.length > 0;

const validateEmail = (email: string): NullableUndefined<string> =>
  normalizeRegistroEmail(email).length === 0
    ? LOGIN_ERROR_MESSAGE.EMAIL_REQUIRED
    : !REGISTRO_EMAIL_PATTERN.test(normalizeRegistroEmail(email))
      ? LOGIN_ERROR_MESSAGE.EMAIL_INVALID
      : undefined;

// Sin largo mínimo: login no debe rechazar contraseñas viejas, solo vacías.
const validatePassword = (password: string): NullableUndefined<string> =>
  password.length === 0 ? LOGIN_ERROR_MESSAGE.PASSWORD_REQUIRED : undefined;

export const validateLoginForm = (values: LoginFormValues): LoginFormErrors => ({
  [LOGIN_FIELD.EMAIL]: validateEmail(values.email),
  [LOGIN_FIELD.PASSWORD]: validatePassword(values.password),
});

export const hasLoginErrors = (errors: LoginFormErrors): boolean =>
  Object.values(errors).some((message) => message !== undefined);
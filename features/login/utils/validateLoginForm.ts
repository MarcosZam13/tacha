import type { NullableUndefined } from "@/types/nullable.types";
import { EMAIL_PATTERN } from "@/constants";
import { normalizeEmail } from "@/utils/email.utils";
import { LOGIN_ERROR_MESSAGE, LOGIN_FIELD } from "../constants/login.constants";
import type { LoginFormErrors, LoginFormValues } from "../models/LoginFormValues.interface";

// Habilita el botón: todo campo con algo escrito.
export const isLoginFormComplete = (values: LoginFormValues): boolean =>
  values.email.length > 0 && values.password.length > 0;

const validateEmail = (email: string): NullableUndefined<string> =>
  normalizeEmail(email).length === 0
    ? LOGIN_ERROR_MESSAGE.EMAIL_REQUIRED
    : !EMAIL_PATTERN.test(normalizeEmail(email))
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
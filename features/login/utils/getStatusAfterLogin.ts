import { PASSWORD_STRENGTH_LEVEL } from "@/constants";
import { evaluatePasswordStrength } from "@/utils/password.utils";
import { LOGIN_RESULT, LOGIN_SUBMIT_STATUS } from "../constants/login.constants";
import type { LoginResultType, LoginSubmitStatusType } from "../constants/login.constants";

/**
 * Estado del login después de que el servicio responde. La fortaleza se evalúa solo si el
 * inicio de sesión fue exitoso: un intento fallido nunca revela si la contraseña era débil.
 */
export const getStatusAfterLogin = (
  result: LoginResultType,
  password: string,
): LoginSubmitStatusType =>
  result !== LOGIN_RESULT.SUCCESS
    ? LOGIN_SUBMIT_STATUS.ERROR
    : evaluatePasswordStrength(password).level === PASSWORD_STRENGTH_LEVEL.WEAK
      ? LOGIN_SUBMIT_STATUS.WEAK_PASSWORD
      : LOGIN_SUBMIT_STATUS.SUCCESS;

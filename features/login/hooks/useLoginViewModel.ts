import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { NullableUndefined } from "@/types/nullable.types";
import { normalizeEmail } from "@/utils/email.utils";
import {
  LOGIN_ERROR_MESSAGE,
  LOGIN_FIELD,
  LOGIN_RESULT,
  LOGIN_RESULT_MESSAGE,
  LOGIN_SUBMIT_STATUS,
} from "../constants/login.constants";
import type { LoginFieldType, LoginResultType, LoginSubmitStatusType } from "../constants/login.constants";
import type { LoginFormErrors, LoginFormValues } from "../models/LoginFormValues.interface";
import type { LoginViewModel } from "../models/LoginViewModel.interface";
import { loginWithRecaptcha } from "../services/login.service";
import { getStatusAfterLogin } from "../utils/getStatusAfterLogin";
import { resolvePostLoginRoute } from "../utils/resolvePostLoginRoute";
import { hasLoginErrors, isLoginFormComplete, validateLoginForm } from "../utils/validateLoginForm";

const INITIAL_VALUES: LoginFormValues = { email: "", password: "" };

export const useLoginViewModel = (): LoginViewModel => {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [status, setStatus] = useState<LoginSubmitStatusType>(LOGIN_SUBMIT_STATUS.IDLE);
  const [submitError, setSubmitError] = useState<NullableUndefined<string>>(undefined);
  const [captchaToken, setCaptchaToken] = useState<NullableUndefined<string>>(undefined);
  const [captchaResetCount, setCaptchaResetCount] = useState(0);

  const isSubmitting = status === LOGIN_SUBMIT_STATUS.SUBMITTING;
  const isWeakPassword = status === LOGIN_SUBMIT_STATUS.WEAK_PASSWORD;

  // Al escribir en un campo se limpia solo el error de ese campo.
  const handleChange =
    (field: LoginFieldType) =>
    (value: string): void => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    };

  const submitLogin = async (token: string): Promise<void> => {
    setStatus(LOGIN_SUBMIT_STATUS.SUBMITTING);
    setSubmitError(undefined);

    const result = await loginWithRecaptcha({
      captchaToken: token,
      email: normalizeEmail(values.email),
      password: values.password,
    }).catch((): LoginResultType => LOGIN_RESULT.ERROR);

    const nextStatus = getStatusAfterLogin(result, values.password);
    setStatus(nextStatus);
    setSubmitError(LOGIN_RESULT_MESSAGE[result]);
    // Un token de reCAPTCHA sirve para un solo intento: se descarta y se pide uno nuevo.
    setCaptchaToken(undefined);
    setCaptchaResetCount((previous) => previous + 1);
    // Con el login exitoso la contraseña escrita ya cumplió su función: no se deja en memoria.
    if (nextStatus !== LOGIN_SUBMIT_STATUS.ERROR) {
      setValues((previous) => ({ ...previous, [LOGIN_FIELD.PASSWORD]: "" }));
    }
    // Con contraseña débil se queda en la pantalla para mostrar el aviso en vez de entrar a la app.
    return nextStatus === LOGIN_SUBMIT_STATUS.SUCCESS ? router.push(resolvePostLoginRoute()) : undefined;
  };

  const handleContinue = (): void => router.push(resolvePostLoginRoute());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateLoginForm(values);
    setErrors(validationErrors);
    setSubmitError(captchaToken ? undefined : LOGIN_ERROR_MESSAGE.CAPTCHA_REQUIRED);

    return captchaToken !== undefined && !hasLoginErrors(validationErrors) && !isSubmitting
      ? await submitLogin(captchaToken)
      : undefined;
  };

  return {
    captchaResetCount,
    errors,
    handleCaptchaTokenChange: setCaptchaToken,
    handleChange,
    handleContinue,
    handleSubmit,
    isSubmitDisabled: !isLoginFormComplete(values) || captchaToken === undefined || isSubmitting,
    isSubmitting,
    isWeakPassword,
    submitError,
    values,
  };
};
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { NullableUndefined } from "@/types/nullable.types";
import { normalizeRegistroEmail } from "@/features/registro-manual/utils/validateRegistroForm";
import {
  LOGIN_ERROR_MESSAGE,
  LOGIN_RESULT,
  LOGIN_RESULT_MESSAGE,
  LOGIN_ROUTE,
  LOGIN_SUBMIT_STATUS,
} from "../constants/login.constants";
import type { LoginFieldType, LoginResultType, LoginSubmitStatusType } from "../constants/login.constants";
import type { LoginFormErrors, LoginFormValues } from "../models/LoginFormValues.interface";
import type { LoginViewModel } from "../models/LoginViewModel.interface";
import { loginWithRecaptcha } from "../services/login.service";
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
      email: normalizeRegistroEmail(values.email),
      password: values.password,
    }).catch((): LoginResultType => LOGIN_RESULT.ERROR);

    const isSuccess = result === LOGIN_RESULT.SUCCESS;
    setStatus(isSuccess ? LOGIN_SUBMIT_STATUS.SUCCESS : LOGIN_SUBMIT_STATUS.ERROR);
    setSubmitError(LOGIN_RESULT_MESSAGE[result]);
    // Un token de reCAPTCHA sirve para un solo intento: se descarta y se pide uno nuevo.
    setCaptchaToken(undefined);
    setCaptchaResetCount((previous) => previous + 1);
    return isSuccess ? router.push(LOGIN_ROUTE.HOME) : undefined;
  };

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
    handleSubmit,
    isSubmitDisabled: !isLoginFormComplete(values) || captchaToken === undefined || isSubmitting,
    isSubmitting,
    submitError,
    values,
  };
};
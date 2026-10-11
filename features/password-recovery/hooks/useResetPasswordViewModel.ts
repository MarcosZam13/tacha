import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_ROUTE,
  NEW_PASSWORD_FIELD,
  PASSWORD_UPDATE_RESULT,
  PASSWORD_UPDATE_RESULT_MESSAGE,
} from "@/constants";
import type { NewPasswordFieldType, PasswordUpdateResultType } from "@/constants";
import { updateUserPassword } from "@/services/password.service";
import { revokeOtherSessions, signOutUser } from "@/services/session.service";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { NewPasswordFormValues } from "@/types/new-password.types";
import { evaluatePasswordStrength } from "@/utils/password.utils";
import { hasNewPasswordErrors, validateNewPasswordForm } from "@/utils/validateNewPasswordForm";
import {
  RECOVERY_AUTH_EVENT,
  RECOVERY_CONFIRMATION_GRACE_MS,
  RESET_PASSWORD_ERROR_MESSAGE,
  RESET_PASSWORD_REDIRECT_DELAY_MS,
  RESET_PASSWORD_STATUS,
} from "../constants/password-recovery.constants";
import type { ResetPasswordStatusType } from "../constants/password-recovery.constants";
import type { ResetPasswordViewModel } from "../models/ResetPasswordViewModel.interface";
import { subscribeToRecoveryEvents } from "../services/password-recovery.service";
import { getRecoveryLinkStatus } from "../utils/getRecoveryLinkStatus";
import { resolveLinkVerification } from "../utils/resolveLinkVerification";

const INITIAL_VALUES: NewPasswordFormValues = { confirmPassword: "", newPassword: "" };

export const useResetPasswordViewModel = (): ResetPasswordViewModel => {
  const router = useRouter();
  const [status, setStatus] = useState<ResetPasswordStatusType>(RESET_PASSWORD_STATUS.VERIFYING);
  const [values, setValues] = useState<NewPasswordFormValues>(INITIAL_VALUES);
  const [submitError, setSubmitError] = useState<NullableUndefined<string>>(undefined);

  const isSaving = status === RESET_PASSWORD_STATUS.SAVING;

  // Parte 1: verificar el enlace. Sincroniza con Supabase (algo externo), por eso es un efecto. Lo que
  // trae la URL se lee antes que nada: el cliente de Supabase borra el fragmento al aceptar el enlace, y
  // este efecto corre antes que el del guard, que es quien crea el cliente. Solo se sale de `verifying`
  // una vez: lo que llegue después (otros eventos de sesión) no cambia la pantalla.
  useEffect(() => {
    const initialLink = getRecoveryLinkStatus(window.location.hash);
    let graceTimeoutId: NullableRef<ReturnType<typeof setTimeout>> = null;

    const unsubscribe = subscribeToRecoveryEvents((event) => {
      const verification = resolveLinkVerification(
        initialLink,
        event,
        getRecoveryLinkStatus(window.location.hash),
      );
      setStatus((previous) =>
        previous === RESET_PASSWORD_STATUS.VERIFYING ? verification : previous,
      );

      // Con el fragmento ya borrado solo falta que llegue PASSWORD_RECOVERY, un instante después. Si no
      // llega, el enlace no se da por válido: se falla cerrado en vez de dejar la pantalla cargando.
      const isWaitingForConfirmation =
        event === RECOVERY_AUTH_EVENT.INITIAL_SESSION &&
        verification === RESET_PASSWORD_STATUS.VERIFYING;
      if (isWaitingForConfirmation) {
        graceTimeoutId = setTimeout(
          () =>
            setStatus((previous) =>
              previous === RESET_PASSWORD_STATUS.VERIFYING ? RESET_PASSWORD_STATUS.INVALID : previous,
            ),
          RECOVERY_CONFIRMATION_GRACE_MS,
        );
      }
    });

    return () => {
      unsubscribe();
      if (graceTimeoutId) clearTimeout(graceTimeoutId);
    };
  }, []);

  // Parte 3: tras guardar, a los pocos segundos se va al login solo. replace y no push: "atrás" no debe
  // volver a un formulario cuyo enlace ya se usó. El efecto se limpia si la persona se adelanta con el botón.
  useEffect(() => {
    if (status !== RESET_PASSWORD_STATUS.DONE) return undefined;

    const timeoutId = setTimeout(
      () => router.replace(AUTH_ROUTE.LOGIN),
      RESET_PASSWORD_REDIRECT_DELAY_MS,
    );

    return () => clearTimeout(timeoutId);
  }, [status, router]);

  // Parte 2: el formulario. Se calculan en cada render (no son estado): cambian solos al escribir.
  const validationErrors = validateNewPasswordForm(values);
  const passwordStrength =
    values.newPassword.length > 0 ? evaluatePasswordStrength(values.newPassword) : undefined;
  // Los requisitos de la nueva contraseña los lista el medidor; aquí solo se avisa si no coinciden.
  const confirmPasswordError =
    values.confirmPassword.length > 0
      ? validationErrors[NEW_PASSWORD_FIELD.CONFIRM_PASSWORD]
      : undefined;

  // Al escribir se limpia el error general del intento anterior.
  const handleChange =
    (field: NewPasswordFieldType) =>
    (value: string): void => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setSubmitError(undefined);
    };

  const handleGoToLogin = (): void => router.replace(AUTH_ROUTE.LOGIN);

  const showFailure = (message: NullableUndefined<string>): void => {
    setStatus(RESET_PASSWORD_STATUS.READY);
    setSubmitError(message);
  };

  const saveNewPassword = async (): Promise<void> => {
    setStatus(RESET_PASSWORD_STATUS.SAVING);
    setSubmitError(undefined);

    // Primero se cierran las demás sesiones de la cuenta y solo si se confirmó se cambia la contraseña: quien
    // recupera una contraseña puede haber perdido la cuenta, y cambiarla no cierra las sesiones de otra persona.
    // Así un fallo de la red deja la contraseña sin cambiar (se reintenta), en vez de cambiarla con el
    // atacante adentro y decir "actualizada".
    if (!(await revokeOtherSessions())) {
      showFailure(RESET_PASSWORD_ERROR_MESSAGE.SESSIONS_NOT_CLOSED);
      return;
    }

    const result = await updateUserPassword(values.newPassword).catch(
      (): PasswordUpdateResultType => PASSWORD_UPDATE_RESULT.ERROR,
    );

    if (result !== PASSWORD_UPDATE_RESULT.SUCCESS) {
      showFailure(PASSWORD_UPDATE_RESULT_MESSAGE[result]);
      return;
    }

    // Se cierra la sesión de recuperación de este navegador (no lanza: la contraseña ya cambió y se sigue).
    // La contraseña se borra de la memoria recién al mostrar la confirmación, no antes: mientras tanto el
    // formulario sigue a la vista con "Guardando..." y no debe verse vacío.
    await signOutUser();
    setValues(INITIAL_VALUES);
    setStatus(RESET_PASSWORD_STATUS.DONE);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    // Solo con el enlace verificado y sin otro guardado en curso: `status` es `ready` únicamente ahí.
    return !hasNewPasswordErrors(validationErrors) && status === RESET_PASSWORD_STATUS.READY
      ? await saveNewPassword()
      : undefined;
  };

  return {
    confirmPasswordError,
    handleChange,
    handleGoToLogin,
    handleSubmit,
    isSaveDisabled: hasNewPasswordErrors(validationErrors) || isSaving,
    isSaving,
    passwordStrength,
    status,
    submitError,
    values,
  };
};

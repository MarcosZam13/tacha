"use client";

import { Spinner } from "@/components/ui";
import { SPINNER_SIZE } from "@/constants";
import { ResetPasswordDone } from "./components/ResetPasswordDone";
import { ResetPasswordForm } from "./components/ResetPasswordForm";
import { ResetPasswordInvalid } from "./components/ResetPasswordInvalid";
import { RESET_PASSWORD_LABEL, RESET_PASSWORD_STATUS } from "./constants/password-recovery.constants";
import { useResetPasswordViewModel } from "./hooks/useResetPasswordViewModel";

/**
 * Pantalla donde se escribe la nueva contraseña, a la que lleva el enlace del correo. "use client" porque
 * usa hooks y habla con Supabase desde el navegador. Elige qué mostrar según el estado: verificando el
 * enlace, el formulario (también mientras guarda), el enlace no válido o la confirmación.
 */
export const ResetPassword = (): React.JSX.Element => {
  const viewModel = useResetPasswordViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      {viewModel.status === RESET_PASSWORD_STATUS.VERIFYING ? (
        <div className="flex justify-center">
          <Spinner size={SPINNER_SIZE.LARGE} label={RESET_PASSWORD_LABEL.CHECKING} />
        </div>
      ) : viewModel.status === RESET_PASSWORD_STATUS.INVALID ? (
        <ResetPasswordInvalid />
      ) : viewModel.status === RESET_PASSWORD_STATUS.DONE ? (
        <ResetPasswordDone onGoToLogin={viewModel.handleGoToLogin} />
      ) : (
        <ResetPasswordForm {...viewModel} />
      )}
    </main>
  );
};

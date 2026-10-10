"use client";

import { ForgotPasswordForm } from "./components/ForgotPasswordForm";
import { ForgotPasswordSent } from "./components/ForgotPasswordSent";
import { FORGOT_PASSWORD_STATUS } from "./constants/password-recovery.constants";
import { useForgotPasswordViewModel } from "./hooks/useForgotPasswordViewModel";

/**
 * Pantalla para pedir el enlace de recuperación de contraseña. "use client" porque usa hooks y habla
 * con Supabase desde el navegador. Con la solicitud hecha reemplaza el formulario por la confirmación.
 */
export const ForgotPassword = (): React.JSX.Element => {
  const viewModel = useForgotPasswordViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      {viewModel.status === FORGOT_PASSWORD_STATUS.SENT ? (
        <ForgotPasswordSent onUseAnotherEmail={viewModel.handleUseAnotherEmail} />
      ) : (
        <ForgotPasswordForm {...viewModel} />
      )}
    </main>
  );
};

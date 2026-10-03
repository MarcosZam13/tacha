"use client";

import { LoginForm } from "./components/LoginForm";
import { WeakPasswordFlow } from "./components/WeakPasswordFlow";
import { useLoginViewModel } from "./hooks/useLoginViewModel";

/**
 * Pantalla de inicio de sesión. "use client" porque usa hooks y habla con Supabase desde el navegador.
 * Si el login fue exitoso pero la contraseña es débil, en lugar de entrar a la app muestra el aviso.
 */
export const Login = (): React.JSX.Element => {
  const viewModel = useLoginViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      {viewModel.isWeakPassword ? (
        <WeakPasswordFlow onContinue={viewModel.handleContinue} />
      ) : (
        <LoginForm {...viewModel} />
      )}
    </main>
  );
};

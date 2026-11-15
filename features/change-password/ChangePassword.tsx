"use client";

import Link from "next/link";
import { FocusedHeading } from "@/components/focused-heading/FocusedHeading";
import { APP_ROUTE } from "@/constants";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { CHANGE_PASSWORD_TEXT } from "./constants/change-password.constants";
import { useChangePasswordViewModel } from "./hooks/useChangePasswordViewModel";

/**
 * Pantalla para cambiar la contraseña desde el perfil (SCRUM-54). Va dentro del shell de las rutas
 * privadas, que ya trae el <main>. "use client" porque usa hooks y habla con Supabase desde el navegador.
 */
export const ChangePassword = (): React.JSX.Element => {
  const viewModel = useChangePasswordViewModel();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <Link
        href={APP_ROUTE.PROFILE}
        className="font-body text-sm font-semibold text-tacha-teal hover:underline"
      >
        {CHANGE_PASSWORD_TEXT.BACK_TO_PROFILE}
      </Link>
      <FocusedHeading>{CHANGE_PASSWORD_TEXT.TITLE}</FocusedHeading>
      <ChangePasswordForm {...viewModel} />
    </div>
  );
};

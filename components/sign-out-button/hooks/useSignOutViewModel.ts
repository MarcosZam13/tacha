import { useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_ROUTE } from "@/constants";
import { useHasUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { signOutUser } from "@/services/session.service";
import { SIGN_OUT_STATUS } from "../constants/sign-out.constants";
import type { SignOutStatusType } from "../constants/sign-out.constants";
import type { SignOutViewModel } from "../models/SignOutViewModel.interface";

export const useSignOutViewModel = (): SignOutViewModel => {
  const router = useRouter();
  const hasUnsavedChanges = useHasUnsavedChanges();
  const [status, setStatus] = useState<SignOutStatusType>(SIGN_OUT_STATUS.IDLE);

  const isSigningOut = status === SIGN_OUT_STATUS.SIGNING_OUT;

  const performSignOut = async (): Promise<void> => {
    setStatus(SIGN_OUT_STATUS.SIGNING_OUT);

    // No lanza y no espera para siempre (tope en el servicio): se redirige pase lo que pase. replace y no
    // push: con push, "atrás" volvería a una pantalla privada sin sesión.
    await signOutUser();
    router.replace(AUTH_ROUTE.LOGIN);
  };

  // Un segundo clic mientras se cierra no hace nada.
  const handleRequest = async (): Promise<void> => {
    if (isSigningOut) return;

    if (hasUnsavedChanges) {
      setStatus(SIGN_OUT_STATUS.CONFIRMING);
      return;
    }

    await performSignOut();
  };

  const handleConfirm = async (): Promise<void> => (isSigningOut ? undefined : await performSignOut());

  const handleCancel = (): void =>
    setStatus((previous) => (previous === SIGN_OUT_STATUS.CONFIRMING ? SIGN_OUT_STATUS.IDLE : previous));

  return {
    handleCancel,
    handleConfirm,
    handleRequest,
    isConfirmOpen: status === SIGN_OUT_STATUS.CONFIRMING,
    isSigningOut,
    status,
  };
};

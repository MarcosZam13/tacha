"use client";

import { Spinner } from "@/components/ui";
import { SPINNER_SIZE } from "@/constants";
import { COMPLETE_SIGN_UP_GATE_LABEL } from "./constants/complete-sign-up.constants";
import { useCompleteSignUpGateViewModel } from "./hooks/useCompleteSignUpGateViewModel";
import type { CompleteSignUpGateProps } from "./models/CompleteSignUpGateProps.interface";

/**
 * Envuelve las pantallas privadas (app/(app)/layout.tsx). Muestra un indicador mientras llega la
 * sesión, nada mientras envía a /registro/completar (SCRUM-43) y la pantalla en cualquier otro caso.
 */
export const CompleteSignUpGate = ({ children }: CompleteSignUpGateProps): React.JSX.Element | null => {
  const { isChecking, isRedirecting } = useCompleteSignUpGateViewModel();

  if (isRedirecting) return null;

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-tacha-bg">
        <Spinner size={SPINNER_SIZE.LARGE} label={COMPLETE_SIGN_UP_GATE_LABEL.CHECKING} />
      </div>
    );
  }

  return <>{children}</>;
};

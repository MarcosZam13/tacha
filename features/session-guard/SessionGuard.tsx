"use client";

import { Spinner } from "@/components/ui";
import { SPINNER_SIZE } from "@/constants";
import { SESSION_GUARD_LABEL } from "./constants/session-guard.constants";
import { useSessionGuardViewModel } from "./hooks/useSessionGuardViewModel";
import type { SessionGuardProps } from "./models/SessionGuardProps.interface";

/**
 * Decide qué se ve en cada ruta: el contenido, un indicador de carga mientras se verifica la sesión,
 * o nada mientras se redirige al login. Con el interruptor apagado siempre muestra el contenido.
 */
export const SessionGuard = ({ children }: SessionGuardProps): React.JSX.Element | null => {
  const { canShowContent, isVerifying } = useSessionGuardViewModel();

  if (canShowContent) return <>{children}</>;
  if (!isVerifying) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-tacha-bg">
      <Spinner size={SPINNER_SIZE.LARGE} label={SESSION_GUARD_LABEL.CHECKING} />
    </div>
  );
};

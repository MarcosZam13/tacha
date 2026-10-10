"use client";

import { INACTIVITY_LABEL } from "../constants/login.constants";
import { useInactivityNoticeViewModel } from "../hooks/useInactivityNoticeViewModel";

/**
 * Aviso de que la sesión se cerró por inactividad. No dibuja nada si no se llegó por ese motivo.
 * role="status": un lector de pantalla lo anuncia sin quitarle el foco al formulario.
 */
export const InactivityNotice = (): React.JSX.Element | null => {
  const shouldShowNotice = useInactivityNoticeViewModel();

  if (!shouldShowNotice) return null;

  return (
    <p
      role="status"
      className="rounded-lg border border-tacha-border bg-tacha-surface p-3 font-body text-sm text-tacha-textsec"
    >
      {INACTIVITY_LABEL.NOTICE}
    </p>
  );
};

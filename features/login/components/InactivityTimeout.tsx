"use client";

import { useInactivityTimeoutViewModel } from "../hooks/useInactivityTimeoutViewModel";

/**
 * Cierra la sesión tras un periodo sin actividad. No dibuja nada: existe para montar el ViewModel
 * (hooks y listeners del navegador, por eso "use client") desde el layout raíz.
 */
export const InactivityTimeout = (): null => {
  useInactivityTimeoutViewModel();

  return null;
};

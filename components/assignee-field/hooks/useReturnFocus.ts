import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Devuelve el foco al botón del campo cuando se cierra el selector (SPEC §9): el `Modal` compartido no lo
 * hace, y al desmontarse el panel el foco se iría al inicio de la página.
 */
export const useReturnFocus = (isOpen: boolean): RefObject<HTMLButtonElement | null> => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) triggerRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  return triggerRef;
};

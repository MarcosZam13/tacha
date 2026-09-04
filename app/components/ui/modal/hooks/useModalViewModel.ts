import { useEffect } from "react";

const ESCAPE_KEY = "Escape";

interface UseModalViewModelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Cierra el modal con Escape mientras está abierto. No atrapa el foco todavía (ver specs/SPEC.md). */
export const useModalViewModel = ({ isOpen, onClose }: UseModalViewModelProps): void => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ESCAPE_KEY) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
};

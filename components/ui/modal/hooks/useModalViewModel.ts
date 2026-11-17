import { useEffect, useEffectEvent, useRef } from "react";
import { KEYBOARD_KEY, MODAL_FOCUS_RETURN_DELAY_MS } from "@/constants";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { ModalViewModel, UseModalViewModelProps } from "../models/ModalViewModel.interface";
import {
  focusFirstElement,
  getFocusOwner,
  keepFocusOnOverlayMouseDown,
  keepTabInside,
  returnFocus,
  returnFocusInside,
} from "../utils/modalFocus";

/**
 * Foco del Modal compartido (SCRUM-142, components/ui/modal/specs/SPEC.md): al abrir lo mueve adentro,
 * mientras está abierto no lo deja afuera (Tab, un clic fuera que no cierra o un botón que se
 * deshabilita), Escape pide cerrar con onClose, como antes, y al cerrar el foco vuelve al elemento que
 * lo tenía.
 */
export const useModalViewModel = ({ isOpen, onClose }: UseModalViewModelProps): ModalViewModel => {
  const dialogRef = useRef<NullableRef<HTMLDivElement>>(null);
  // useEffectEvent: el oyente llama siempre al onClose más nuevo sin volver a correr el efecto. Muchos
  // usos pasan una función nueva en cada render, y el efecto movería el foco otra vez (regla 5).
  const requestClose = useEffectEvent(() => onClose());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;

    const focusOwner = getFocusOwner();
    focusFirstElement(dialog);

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === KEYBOARD_KEY.ESCAPE) requestClose();
      if (event.key === KEYBOARD_KEY.TAB) keepTabInside(event, dialog);
    };

    // D3: el foco salió del diálogo hacia nada o hacia afuera. La vuelta se agenda para la próxima tarea
    // (precaución, no algo medido): si el mismo evento cierra el Modal, React ya lo aplicó, la limpieza
    // cancela la vuelta y no se pisa un foco movido a propósito. Chromium también avisa esta salida al
    // quitar el diálogo, cuando todavía está conectado (plan, duda 4); por eso se mira isConnected.
    let pendingFocusReturn: NullableUndefined<ReturnType<typeof setTimeout>>;
    const handleFocusOut = (event: FocusEvent): void => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && dialog.contains(nextTarget)) return;

      clearTimeout(pendingFocusReturn);
      pendingFocusReturn = setTimeout(() => {
        if (dialog.isConnected) returnFocusInside(event.target, dialog);
      }, MODAL_FOCUS_RETURN_DELAY_MS);
    };

    document.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("focusout", handleFocusOut);
    // La limpieza corre al cerrar y al desmontarse abierto, antes que los efectos nuevos de la pantalla
    // en el mismo cambio. Aun así, lo que protege a SCRUM-61 es la condición de returnFocus, no el orden.
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("focusout", handleFocusOut);
      clearTimeout(pendingFocusReturn);
      returnFocus(focusOwner, dialog);
    };
  }, [isOpen]);

  return { dialogRef, onOverlayMouseDown: keepFocusOnOverlayMouseDown };
};

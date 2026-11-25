import type { NullableRef } from "@/types/nullable.types";
import { getFocusableElements } from "./getFocusableElements";

// Funciones de foco del Modal compartido (SCRUM-142). Solo tocan el DOM; el ViewModel decide cuándo
// llamarlas (components/ui/modal/hooks/useModalViewModel.ts).

/** El primer elemento enfocable del diálogo o, si no hay ninguno, el propio diálogo (D1). */
export const focusFirstElement = (dialog: HTMLElement): void => {
  const [firstElement] = getFocusableElements(dialog);
  (firstElement ?? dialog).focus();
};

/**
 * Tab y Shift+Tab dan la vuelta dentro del diálogo (regla 7). Solo interviene en los extremos, sin
 * enfocables o con el foco fuera del diálogo; entre los demás sigue el orden del navegador.
 */
export const keepTabInside = (event: KeyboardEvent, dialog: HTMLElement): void => {
  const focusableElements = getFocusableElements(dialog);
  const activeElement = document.activeElement;
  const firstElement = focusableElements.at(0);
  const lastElement = focusableElements.at(-1);

  if (!firstElement || !lastElement) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  // El foco salió (por ejemplo, el navegador lo mandó a body): el siguiente Tab lo trae de vuelta.
  if (!dialog.contains(activeElement)) {
    event.preventDefault();
    firstElement.focus();
    return;
  }

  const isOnDialog = activeElement === dialog;

  if (event.shiftKey && (activeElement === firstElement || isOnDialog)) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && (activeElement === lastElement || isOnDialog)) {
    event.preventDefault();
    firstElement.focus();
  }
};

/**
 * Trae el foco de vuelta a un diálogo abierto (D3, regla 11): al elemento que lo perdió, si sigue
 * conectado y habilitado; si no, al primer enfocable; y si no hay ninguno, al propio diálogo.
 */
export const returnFocusInside = (lostElement: EventTarget | null, dialog: HTMLElement): void => {
  // Ya volvió adentro (por ejemplo, con Tab): no hay nada que hacer.
  if (dialog.contains(document.activeElement)) return;

  const focusableElements = getFocusableElements(dialog);
  const isLostElementUsable = lostElement instanceof HTMLElement && focusableElements.includes(lostElement);
  const target = isLostElementUsable ? lostElement : focusableElements.at(0);
  (target ?? dialog).focus();
};

/** Un clic en el fondo, que no es enfocable, no le quita el foco al diálogo (D3). Lo de adentro sigue igual. */
export const keepFocusOnOverlayMouseDown = (event: React.MouseEvent<HTMLElement>): void => {
  if (event.target === event.currentTarget) event.preventDefault();
};

/** El elemento que tenía el foco antes de abrir; body o nada no se guardan, porque no hay adónde volver (regla 8). */
export const getFocusOwner = (): NullableRef<HTMLElement> => {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement !== document.body ? activeElement : null;
};

/**
 * Devuelve el foco al cerrar, solo si se cumplen las dos condiciones de la regla 9 (D2):
 * - el elemento guardado sigue en el documento;
 * - el foco quedó perdido: en body, en nada o dentro del diálogo.
 *
 * Si la pantalla ya lo movió a propósito (SCRUM-61 enfoca el título de la sección), no se toca.
 */
export const returnFocus = (focusOwner: NullableRef<HTMLElement>, dialog: HTMLElement): void => {
  if (!focusOwner?.isConnected) return;

  const activeElement = document.activeElement;
  const isFocusLost = activeElement === null || activeElement === document.body || dialog.contains(activeElement);
  if (isFocusLost) focusOwner.focus();
};

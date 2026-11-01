import type { UnsavedChangesSourceType } from "@/constants";

// Qué pantallas tienen cambios sin guardar ahora. Vive fuera de React porque lo escribe una pantalla (el
// formulario de Perfil) y lo lee otra parte del árbol (el botón de cerrar sesión del sidebar), que no
// comparten props. Cada pantalla tiene su propio id: así retirar el aviso de una no borra el de otra.
const sourcesWithChanges = new Set<UnsavedChangesSourceType>();
const listeners = new Set<() => void>();

const notifyListeners = (): void => listeners.forEach((listener) => listener());

/** Marca o retira el aviso de cambios sin guardar de una pantalla. Solo avisa si algo cambió. */
export const setUnsavedChanges = (source: UnsavedChangesSourceType, hasChanges: boolean): void => {
  if (sourcesWithChanges.has(source) === hasChanges) return;

  if (hasChanges) sourcesWithChanges.add(source);
  else sourcesWithChanges.delete(source);
  notifyListeners();
};

/** Si alguna pantalla tiene cambios sin guardar. */
export const hasUnsavedChanges = (): boolean => sourcesWithChanges.size > 0;

/** Avisa cada vez que cambia el resultado de `hasUnsavedChanges`. Devuelve cómo cancelar la suscripción. */
export const subscribeToUnsavedChanges = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

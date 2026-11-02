import { useEffect, useSyncExternalStore } from "react";
import type { UnsavedChangesSourceType } from "@/constants";
import {
  hasUnsavedChanges,
  setUnsavedChanges,
  subscribeToUnsavedChanges,
} from "@/services/unsaved-changes.service";

// En el servidor no hay pantallas editándose: el valor inicial es "sin cambios".
const getServerSnapshot = (): boolean => false;

/**
 * Para la pantalla que edita algo: informa mientras `hasChanges` sea verdadero y retira el aviso al guardarse
 * o al desmontarse. Es un efecto porque sincroniza con algo externo (el registro de cambios sin guardar).
 */
export const useReportUnsavedChanges = (source: UnsavedChangesSourceType, hasChanges: boolean): void => {
  useEffect(() => {
    setUnsavedChanges(source, hasChanges);

    return () => setUnsavedChanges(source, false);
  }, [source, hasChanges]);
};

/** Para quien necesita saber si alguna pantalla tiene cambios sin guardar (el botón de cerrar sesión). */
export const useHasUnsavedChanges = (): boolean =>
  useSyncExternalStore(subscribeToUnsavedChanges, hasUnsavedChanges, getServerSnapshot);

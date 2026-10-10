import {
  INACTIVITY_NOTICE_FLAG,
  INACTIVITY_NOTICE_STORAGE_KEY,
} from "../constants/login.constants";

// Respaldo por si sessionStorage está bloqueado: la navegación a /login es del lado del cliente
// (sin recarga), así que una variable del módulo sobrevive hasta que el login la consuma.
let isNoticePending = false;

/** Deja anotado que el próximo login debe avisar que la sesión se cerró por inactividad. */
export const markInactivityLogout = (): void => {
  isNoticePending = true;

  try {
    window.sessionStorage.setItem(INACTIVITY_NOTICE_STORAGE_KEY, INACTIVITY_NOTICE_FLAG);
  } catch {
    // Queda solo la bandera en memoria.
  }
};

/**
 * Lee y borra la bandera: el aviso se muestra una vez. Devuelve si había una pendiente.
 * No lanza: sin sessionStorage solo cuenta la bandera en memoria.
 */
export const consumeInactivityNotice = (): boolean => {
  let isStored = false;

  try {
    isStored = window.sessionStorage.getItem(INACTIVITY_NOTICE_STORAGE_KEY) === INACTIVITY_NOTICE_FLAG;
    window.sessionStorage.removeItem(INACTIVITY_NOTICE_STORAGE_KEY);
  } catch {
    // Sin sessionStorage no hay nada guardado que leer ni borrar.
  }

  const wasPending = isNoticePending || isStored;
  isNoticePending = false;

  return wasPending;
};

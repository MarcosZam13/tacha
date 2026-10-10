import type { NullableRef } from "@/types/nullable.types";
import { INACTIVITY } from "../constants/login.constants";

// Respaldo por si localStorage está bloqueado (modo privado estricto, datos del sitio desactivados):
// la pestaña igual puede cerrarse por su propia inactividad, solo que sin compartir con las otras.
let memoryLastActivity: NullableRef<number> = null;
let lastRecordedAt = 0;

// Leer o escribir localStorage puede lanzar; en ese caso se actúa como si no hubiera marca guardada.
const readStoredActivity = (): NullableRef<number> => {
  try {
    const stored = Number(window.localStorage.getItem(INACTIVITY.STORAGE_KEY));

    // getItem devuelve null si no hay marca, y Number(null) es 0: se descarta con el resto de lo no válido.
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
};

/**
 * Última actividad conocida, en ms. La marca de localStorage es la que comparten todas las pestañas;
 * si no hay (o no se puede leer) se usa la de esta pestaña, y si tampoco, `now`: sin ningún
 * registro no hay con qué decir que pasó tiempo, así que no se cierra la sesión por inactividad.
 * Nunca es posterior a `now`: una marca futura (el reloj estuvo adelantado y se corrigió) haría que
 * una sesión inactiva no venza hasta que alguien toque la pantalla.
 */
export const readLastActivity = (now: number): number =>
  Math.min(readStoredActivity() ?? memoryLastActivity ?? now, now);

/**
 * Registra actividad en `now`. Como máximo una escritura por `RECORD_THROTTLE_MS`: scroll y
 * pointerdown pueden disparar decenas de eventos por segundo y cada uno sería una escritura síncrona.
 */
export const recordActivity = (now: number): void => {
  // Si el reloj retrocede, `now - lastRecordedAt` es negativo y también se omite: se espera a alcanzarlo.
  const isThrottled = now - lastRecordedAt < INACTIVITY.RECORD_THROTTLE_MS;
  if (isThrottled) return;

  lastRecordedAt = now;
  memoryLastActivity = now;

  try {
    window.localStorage.setItem(INACTIVITY.STORAGE_KEY, String(now));
  } catch {
    // Sin localStorage queda solo la marca en memoria.
  }
};

/** Borra la marca (al cerrar sesión): la siguiente sesión empieza sin actividad previa. */
export const clearLastActivity = (): void => {
  memoryLastActivity = null;
  lastRecordedAt = 0;

  try {
    window.localStorage.removeItem(INACTIVITY.STORAGE_KEY);
  } catch {
    // Nada que borrar si no se puede acceder.
  }
};

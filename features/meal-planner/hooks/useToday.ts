import { useMemo, useSyncExternalStore } from "react";
import type { NullableRef } from "@/types/nullable.types";

// "Hoy" se lee una sola vez y no cambia mientras la pantalla está abierta
// (SPEC regla 9), así que no hay nada a qué suscribirse.
const subscribeToNothing = (): (() => void) => () => undefined;

// Medianoche local del día de hoy, en milisegundos. Es un número y no un Date
// porque useSyncExternalStore compara el valor entre renders: un Date nuevo en
// cada llamada se vería como un cambio constante y entraría en un bucle.
const getClientSnapshot = (): NullableRef<number> => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

// En el servidor no se conoce "hoy": el día y la zona horaria son los del
// servidor, no los del usuario.
const getServerSnapshot = (): NullableRef<number> => null;

/**
 * El día de hoy en hora local del navegador, o null mientras no se conoce
 * (en el servidor y durante la hidratación).
 *
 * useSyncExternalStore y no useState + useEffect: dibuja null en el servidor y
 * en la hidratación y pasa al valor real en el navegador sin un desajuste
 * entre los dos, y sin un setState dentro de un efecto (nextjs-enterprise-patterns §3).
 */
export const useToday = (): NullableRef<Date> => {
  const todayTimestamp = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  // El mismo Date mientras el día no cambie: quien lo use como dependencia no se recalcula de más.
  return useMemo(() => (todayTimestamp === null ? null : new Date(todayTimestamp)), [todayTimestamp]);
};

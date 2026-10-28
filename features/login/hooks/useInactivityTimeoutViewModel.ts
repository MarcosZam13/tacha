import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SESSION_STATUS } from "@/constants";
import type { SessionStatusType } from "@/constants";
import { signOutUser, subscribeToSessionChanges } from "@/services/session.service";
import type { NullableRef } from "@/types/nullable.types";
import { getSessionStatus } from "@/utils/getSessionStatus";
import {
  INACTIVITY,
  INACTIVITY_ACTIVITY_EVENTS,
  INACTIVITY_TIMEOUT_MINUTES_RAW,
  INACTIVITY_VISIBILITY_EVENT,
  LOGIN_ROUTE,
} from "../constants/login.constants";
import {
  clearLastActivity,
  readLastActivity,
  recordActivity,
} from "../services/activity.service";
import { markInactivityLogout } from "../services/inactivity-notice.service";
import { isInactivityExpired } from "../utils/isInactivityExpired";
import { parseInactivityLimit } from "../utils/parseInactivityLimit";

// La variable no cambia mientras la app corre (se lee al compilar): se resuelve una sola vez.
const LIMIT_MINUTES = parseInactivityLimit(INACTIVITY_TIMEOUT_MINUTES_RAW);

/**
 * Cierra la sesión cuando pasa el límite sin actividad. No devuelve nada: no dibuja nada.
 * Solo actúa con una sesión real; una anónima o ninguna no se mide.
 */
export const useInactivityTimeoutViewModel = (): void => {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatusType>(SESSION_STATUS.CHECKING);

  // Parte 1 — Sincroniza con la sesión de Supabase (algo externo, por eso es un efecto).
  // Todo lo demás depende de `status`, que se deriva de la sesión y no se guarda por separado.
  useEffect(
    () => subscribeToSessionChanges((session) => setStatus(getSessionStatus(session))),
    [],
  );

  // Parte 2 — Con sesión real: escucha la actividad y vigila el vencimiento. Se arma al quedar
  // autenticado y se desarma al perder la sesión o desmontar (la función que devuelve limpia todo).
  useEffect(() => {
    if (status !== SESSION_STATUS.AUTHENTICATED) return undefined;

    let timeoutId: NullableRef<ReturnType<typeof setTimeout>> = null;
    // No se reinicia: cada cierre termina con la sesión y desarma este efecto, así que no hay
    // un segundo intento que evitar ni uno que reintentar.
    let isExpiring = false;

    const expireSession = async (): Promise<void> => {
      isExpiring = true;
      // Antes de cerrar la sesión: con el guard encendido, el SIGNED_OUT lo lleva a /login y el
      // login tiene que encontrar la bandera ya puesta, sin importar quién redirija primero.
      markInactivityLogout();
      await signOutUser();
      clearLastActivity();
      // replace y no push: con push, "atrás" volvería a una pantalla privada sin sesión.
      router.replace(LOGIN_ROUTE.LOGIN);
    };

    // Compara marcas de tiempo, no confía en que el temporizador llegue a tiempo: en una pestaña
    // oculta se retrasa, y otra pestaña pudo registrar actividad después.
    const checkInactivity = (): void => {
      if (isExpiring) return;

      const now = Date.now();
      const lastActivity = readLastActivity(now);

      if (isInactivityExpired(now, lastActivity, LIMIT_MINUTES)) {
        void expireSession();
        return;
      }

      const remainingMs = LIMIT_MINUTES * INACTIVITY.MS_PER_MINUTE - (now - lastActivity);
      timeoutId = setTimeout(checkInactivity, remainingMs);
    };

    const handleActivity = (): void => recordActivity(Date.now());

    // Al volver a la pestaña no se espera al temporizador: se revisa de inmediato.
    const handleVisibilityChange = (): void => {
      if (document.hidden) return;

      if (timeoutId) clearTimeout(timeoutId);
      checkInactivity();
    };

    // capture: scroll no burbujea, y así también cuenta el de un contenedor con su propio scroll.
    const listenerOptions = { capture: true, passive: true } as const;
    INACTIVITY_ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, listenerOptions),
    );
    document.addEventListener(INACTIVITY_VISIBILITY_EVENT, handleVisibilityChange);

    checkInactivity();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      INACTIVITY_ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity, listenerOptions),
      );
      document.removeEventListener(INACTIVITY_VISIBILITY_EVENT, handleVisibilityChange);
    };
  }, [status, router]);

  // Una sesión que termina por cualquier causa (cierre, token que no se renueva, otra pestaña) no
  // deja marca: si quedara, el siguiente inicio de sesión (login, verificación de correo...) se
  // compararía contra una actividad vieja y vencería al instante.
  useEffect(() => {
    if (status === SESSION_STATUS.UNAUTHENTICATED) clearLastActivity();
  }, [status]);

  // Cambiar de ruta es una acción de la persona: cuenta como actividad. Va después de la parte 2:
  // en el primer render esa revisa la marca guardada antes de que esta la renueve.
  useEffect(() => {
    if (status === SESSION_STATUS.AUTHENTICATED) recordActivity(Date.now());
  }, [pathname, status]);
};

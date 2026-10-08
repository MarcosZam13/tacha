import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IS_SESSION_GUARD_ENABLED,
  SESSION_GUARD_ROUTE,
  SESSION_STATUS,
} from "../constants/session-guard.constants";
import type { SessionStatusType } from "../constants/session-guard.constants";
import type { SessionGuardViewModel } from "../models/SessionGuardViewModel.interface";
import { subscribeToSessionChanges } from "../services/session.service";
import { getSessionStatus } from "../utils/getSessionStatus";
import { isPublicRoute } from "../utils/isPublicRoute";

export const useSessionGuardViewModel = (): SessionGuardViewModel => {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatusType>(SESSION_STATUS.CHECKING);

  // Se calcula en cada render (no es estado): el guard solo actúa si está encendido y la ruta es privada.
  const isGuarded = IS_SESSION_GUARD_ENABLED && !isPublicRoute(pathname);

  // Sincroniza con algo externo (la sesión de Supabase): por eso es un efecto. Con el guard apagado no
  // se suscribe. Se mantiene suscrito en todas las rutas para que el estado nunca quede viejo; la sesión
  // actual llega con el primer evento (INITIAL_SESSION), así que no hace falta leerla aparte.
  useEffect(() => {
    let unsubscribe = (): void => undefined;

    if (IS_SESSION_GUARD_ENABLED) {
      unsubscribe = subscribeToSessionChanges((session) => setStatus(getSessionStatus(session)));
    }

    return () => unsubscribe();
  }, []);

  // replace y no push: con push, "atrás" volvería a la pantalla privada y la redirección se repetiría.
  useEffect(() => {
    if (isGuarded && status === SESSION_STATUS.UNAUTHENTICATED) {
      router.replace(SESSION_GUARD_ROUTE.LOGIN);
    }
  }, [isGuarded, status, router]);

  return {
    canShowContent: !isGuarded || status === SESSION_STATUS.AUTHENTICATED,
    isVerifying: isGuarded && status === SESSION_STATUS.CHECKING,
  };
};
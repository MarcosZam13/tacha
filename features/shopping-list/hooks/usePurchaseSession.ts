import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APP_ROUTE } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";
import { PURCHASE_SESSION_QUERY, PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import type { PurchaseSession } from "../models/PurchaseSession.interface";
import { getPurchaseSession } from "../services/purchase-session.service";
import { toShoppingModeHref } from "../utils/toShoppingModeHref";

interface UsePurchaseSessionReturn {
  /** La compra de la URL, cargada y abierta; null fuera de modo compra o mientras carga. */
  activeSession: NullableRef<PurchaseSession>;
  /** Entra al modo compra con esa compra (después de iniciarla o retomarla). */
  enterShoppingMode: (sessionId: string) => void;
  /** "Salir": vuelve a la lista normal. La compra queda abierta (CA-06). */
  exitShoppingMode: () => void;
  isLoadingSession: boolean;
  /** Después de cerrar la compra: vuelve a la lista sin dejar la compra cerrada en el historial del navegador. */
  leaveClosedSession: () => void;
  /** Aviso cuando la compra de la URL no está abierta o no se pudo cargar. */
  sessionNoticeMessage: NullableRef<string>;
}

/** La compra cargada junto con el id que la pidió, para no mostrar una vieja como si fuera la nueva. */
interface LoadedSession {
  requestedId: string;
  session: NullableRef<PurchaseSession>;
}

/**
 * Modo compra en la URL (/lista?compra=<id>): recargar lo mantiene y "Salir"
 * es solo navegar. Lee el id, carga la compra y, si no está abierta (cerrada,
 * ajena o inexistente), vuelve a la lista normal con un aviso.
 */
export const usePurchaseSession = (): UsePurchaseSessionReturn => {
  const router = useRouter();
  const sessionId = useSearchParams().get(PURCHASE_SESSION_QUERY.PARAM);
  const [loaded, setLoaded] = useState<NullableRef<LoadedSession>>(null);
  const [sessionNoticeMessage, setSessionNoticeMessage] = useState<NullableRef<string>>(null);

  // Sincroniza con algo externo (la compra en la base) cada vez que cambia la URL.
  useEffect(() => {
    if (!sessionId) return undefined;
    let isCancelled = false;

    const leaveWithNotice = (message: string): void => {
      setSessionNoticeMessage(message);
      router.replace(APP_ROUTE.LIST);
    };

    getPurchaseSession(sessionId)
      .then((session) => {
        if (isCancelled) return;
        setLoaded({ requestedId: sessionId, session });
        if (!session) leaveWithNotice(PURCHASE_SESSION_TEXT.INVALID_SESSION);
      })
      .catch(() => {
        if (!isCancelled) leaveWithNotice(PURCHASE_SESSION_TEXT.SESSION_LOAD_ERROR);
      });

    return () => {
      isCancelled = true;
    };
  }, [router, sessionId]);

  // Derivado, no guardado: solo cuenta la compra que corresponde al id de la URL.
  const activeSession = sessionId && loaded?.requestedId === sessionId ? loaded.session : null;

  const enterShoppingMode = (nextSessionId: string): void => {
    setSessionNoticeMessage(null);
    router.push(toShoppingModeHref(nextSessionId));
  };

  const exitShoppingMode = (): void => {
    router.push(APP_ROUTE.LIST);
  };

  const leaveClosedSession = (): void => {
    router.replace(APP_ROUTE.LIST);
  };

  return {
    activeSession,
    enterShoppingMode,
    exitShoppingMode,
    isLoadingSession: sessionId !== null && loaded?.requestedId !== sessionId,
    leaveClosedSession,
    sessionNoticeMessage,
  };
};

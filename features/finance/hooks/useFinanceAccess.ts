import { useEffect, useRef, useState } from "react";
import { FINANCE_ACCESS_STATUS } from "../constants/finance.constants";
import type { FinanceAccessStatusType } from "../constants/finance.constants";
import { hasRegisteredSession } from "../services/finance.service";

interface UseFinanceAccessReturn {
  accessStatus: FinanceAccessStatusType;
  isRegistered: boolean;
  retryIfRegistered: (retry: () => void) => Promise<void>;
}

/**
 * Quién puede ver Finanzas (SPEC D6), para el Dashboard y el Historial: sin
 * cuenta registrada las pantallas no piden ningún dato.
 */
export const useFinanceAccess = (): UseFinanceAccessReturn => {
  // Arranca en "checking": el efecto nunca hace un setState síncrono para empezar.
  const [accessStatus, setAccessStatus] = useState<FinanceAccessStatusType>(FINANCE_ACCESS_STATUS.CHECKING);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    // Si no se puede leer la sesión, se trata como "sin cuenta": nunca se
    // piden datos sin saber que la sesión es registrada.
    hasRegisteredSession()
      .catch(() => false)
      .then((isRegisteredSession) => {
        if (!isCancelled) {
          setAccessStatus(isRegisteredSession ? FINANCE_ACCESS_STATUS.REGISTERED : FINANCE_ACCESS_STATUS.NO_ACCOUNT);
        }
      });

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, []);

  // Antes de reintentar se vuelve a leer la sesión: si venció o ya no es
  // registrada, se pasa a "sin cuenta" en vez de volver a pedir datos (SPEC §7).
  const retryIfRegistered = async (retry: () => void): Promise<void> => {
    const isRegisteredSession = await hasRegisteredSession().catch(() => false);
    if (!isMountedRef.current) return;
    if (!isRegisteredSession) {
      setAccessStatus(FINANCE_ACCESS_STATUS.NO_ACCOUNT);
      return;
    }
    retry();
  };

  return {
    accessStatus,
    isRegistered: accessStatus === FINANCE_ACCESS_STATUS.REGISTERED,
    retryIfRegistered,
  };
};

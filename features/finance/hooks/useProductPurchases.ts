import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { PRODUCT_DETAIL_STATUS } from "../constants/finance.constants";
import type { ProductDetailStatusType } from "../constants/finance.constants";
import type { ProductPurchase } from "../models/ProductPurchase.interface";
import type { ProductPurchaseTarget } from "../models/ProductPurchaseTarget.type";
import { getProductPurchases, getSavedTimeZone } from "../services/finance.service";
import { toProductTargetId } from "../utils/toProductTargetId";

/** Lo que trae una carga que terminó bien. */
interface PurchasesRead {
  purchases: ProductPurchase[];
  /** La zona guardada para las fechas (regla 87); null = la del navegador. */
  timeZone: NullableRef<string>;
}

/** La última respuesta, guardada con la clave de la carga que la pidió. */
interface PurchasesResponse {
  /** null si la carga falló. */
  read: NullableRef<PurchasesRead>;
  requestKey: string;
}

interface UseProductPurchasesReturn {
  onRetry: () => void;
  purchases: ProductPurchase[];
  status: ProductDetailStatusType;
  timeZone: NullableRef<string>;
}

/**
 * Las compras del producto elegido (SCRUM-93, CA-02). Sin producto elegido no
 * pide nada (`idle`). Mismo patrón que usePeriodPurchases: solo se guarda la
 * última respuesta, con la clave de quien la pidió (producto + reintentos), y
 * la de un producto elegido antes se descarta.
 *
 * La zona guardada se pide junto con las compras: si falla cualquiera de las
 * dos, falla el detalle y "Reintentar" pide las dos otra vez.
 */
export const useProductPurchases = (
  target: NullableRef<ProductPurchaseTarget>,
  isEnabled: boolean,
): UseProductPurchasesReturn => {
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [response, setResponse] = useState<NullableRef<PurchasesResponse>>(null);
  const targetId = target ? toProductTargetId(target) : null;
  const requestKey = `${reloadCount}:${targetId ?? ""}`;

  // Al cerrar el detalle se olvida la respuesta: reabrir el mismo producto
  // muestra la carga y datos nuevos, no los de antes (regla 90).
  if (targetId === null && response !== null) setResponse(null);

  useEffect(() => {
    if (!isEnabled || !target) return undefined;
    let isCancelled = false;

    Promise.all([getProductPurchases(target), getSavedTimeZone()])
      .then(([purchases, timeZone]) => {
        if (!isCancelled) setResponse({ read: { purchases, timeZone }, requestKey });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ read: null, requestKey });
      });

    return () => {
      isCancelled = true;
    };
    // `target` sale del estado del ViewModel: no cambia de identidad entre renders.
  }, [isEnabled, requestKey, target]);

  const currentResponse = isEnabled && targetId !== null && response?.requestKey === requestKey ? response : null;
  const read = currentResponse?.read ?? null;

  const getStatus = (): ProductDetailStatusType => {
    if (!isEnabled || targetId === null) return PRODUCT_DETAIL_STATUS.IDLE;
    if (!currentResponse) return PRODUCT_DETAIL_STATUS.LOADING;
    if (!read) return PRODUCT_DETAIL_STATUS.FAILED;
    return read.purchases.length === 0 ? PRODUCT_DETAIL_STATUS.EMPTY : PRODUCT_DETAIL_STATUS.READY;
  };

  return {
    onRetry: () => setReloadCount((count) => count + 1),
    purchases: read?.purchases ?? [],
    status: getStatus(),
    timeZone: read?.timeZone ?? null,
  };
};

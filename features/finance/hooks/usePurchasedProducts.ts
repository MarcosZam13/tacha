import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { PRODUCT_HISTORY, PRODUCT_LIST_STATUS, PRODUCT_MORE_STATUS } from "../constants/finance.constants";
import type { ProductListStatusType, ProductMoreStatusType } from "../constants/finance.constants";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import type { PurchasedProductsPage } from "../models/PurchasedProductsPage.interface";
import { getPurchasedProducts } from "../services/finance.service";
import { mergeProductPages } from "../utils/mergeProductPages";

/** Lo cargado para una búsqueda, guardado con la clave de la carga que lo pidió. */
interface ProductsRead {
  moreStatus: ProductMoreStatusType;
  /**
   * Cuántos productos llegaron de la base, con repetidos incluidos: es el
   * próximo `offset` (regla 94). No es el largo de la lista unida.
   */
  nextOffset: number;
  /** null si falló el primer bloque. */
  page: NullableRef<PurchasedProductsPage>;
  requestKey: string;
}

interface UsePurchasedProductsReturn {
  /** true mientras falten productos y la base acepte el offset siguiente. */
  hasMore: boolean;
  /** "Cargar más": no pide nada si ya hay un bloque en camino o no falta ninguno. */
  loadMore: () => void;
  moreStatus: ProductMoreStatusType;
  /** Reintenta el primer bloque. "Reintentar" de "Cargar más" es loadMore. */
  onRetry: () => void;
  products: PurchasedProduct[];
  status: ProductListStatusType;
  totalCount: number;
}

/**
 * La lista de la vista "Productos" (SCRUM-93, D33 y D35), por bloques. Pide los
 * datos solo si `isEnabled` (cuenta registrada, D6). `search` es lo que ya
 * esperó el ViewModel (SEARCH_WAIT_MS).
 *
 * - **Búsqueda nueva o reintento:** cambia la clave y vuelve al bloque 0. Lo
 *   cargado con otra clave no se muestra.
 * - **Respuestas viejas:** un bloque, inicial o de "Cargar más", que llega con
 *   otra clave se descarta (regla 94).
 * - **Sin pedidos duplicados:** "Cargar más" no hace nada mientras otro bloque
 *   está en camino.
 * - **Fallo de "Cargar más":** conserva lo cargado (SPEC §6).
 */
export const usePurchasedProducts = (search: string, isEnabled: boolean): UsePurchasedProductsReturn => {
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [read, setRead] = useState<NullableRef<ProductsRead>>(null);
  // La búsqueda sin espacios de los extremos: los espacios solos no vuelven a pedir.
  const trimmedSearch = search.trim();
  const requestKey = `${reloadCount}:${trimmedSearch}`;

  useEffect(() => {
    if (!isEnabled) return undefined;
    let isCancelled = false;

    getPurchasedProducts({ offset: 0, search: trimmedSearch })
      .then((page) => {
        if (isCancelled) return;
        setRead({ moreStatus: PRODUCT_MORE_STATUS.IDLE, nextOffset: page.products.length, page, requestKey });
      })
      .catch(() => {
        if (!isCancelled) setRead({ moreStatus: PRODUCT_MORE_STATUS.IDLE, nextOffset: 0, page: null, requestKey });
      });

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, requestKey, trimmedSearch]);

  const currentRead = isEnabled && read?.requestKey === requestKey ? read : null;
  const page = currentRead?.page ?? null;

  // "Cargar más" responde después de un await: se compara con la clave vigente
  // en ese momento, no con la del render en que se tocó.
  const requestKeyRef = useRef<string>(requestKey);
  const currentReadRef = useRef<NullableRef<ProductsRead>>(currentRead);
  useEffect(() => {
    requestKeyRef.current = requestKey;
    currentReadRef.current = currentRead;
  });

  const hasMore =
    page !== null &&
    currentRead !== null &&
    currentRead.nextOffset < page.totalCount &&
    currentRead.nextOffset <= PRODUCT_HISTORY.MAX_OFFSET;

  const loadMore = (): void => {
    const startRead = currentReadRef.current;
    if (!startRead?.page || startRead.moreStatus === PRODUCT_MORE_STATUS.LOADING_MORE) return;
    if (startRead.nextOffset >= startRead.page.totalCount || startRead.nextOffset > PRODUCT_HISTORY.MAX_OFFSET) return;

    const startKey = startRead.requestKey;
    const loadingRead = { ...startRead, moreStatus: PRODUCT_MORE_STATUS.LOADING_MORE };
    currentReadRef.current = loadingRead;
    setRead(loadingRead);

    getPurchasedProducts({ offset: startRead.nextOffset, search: trimmedSearch })
      .then((nextPage) => {
        if (requestKeyRef.current !== startKey) return;
        setRead((latestRead) =>
          latestRead?.requestKey === startKey && latestRead.page
            ? {
                moreStatus: PRODUCT_MORE_STATUS.IDLE,
                nextOffset: latestRead.nextOffset + nextPage.products.length,
                page: mergeProductPages(latestRead.page, nextPage),
                requestKey: startKey,
              }
            : latestRead,
        );
      })
      .catch(() => {
        if (requestKeyRef.current !== startKey) return;
        setRead((latestRead) =>
          latestRead?.requestKey === startKey ? { ...latestRead, moreStatus: PRODUCT_MORE_STATUS.MORE_FAILED } : latestRead,
        );
      });
  };

  const getStatus = (): ProductListStatusType => {
    if (!currentRead) return PRODUCT_LIST_STATUS.LOADING;
    if (!page) return PRODUCT_LIST_STATUS.FAILED;
    if (page.totalCount === 0 && page.products.length === 0) {
      return trimmedSearch === "" ? PRODUCT_LIST_STATUS.EMPTY : PRODUCT_LIST_STATUS.NO_MATCHES;
    }
    return PRODUCT_LIST_STATUS.READY;
  };

  return {
    hasMore,
    loadMore,
    moreStatus: currentRead?.moreStatus ?? PRODUCT_MORE_STATUS.IDLE,
    onRetry: () => setReloadCount((count) => count + 1),
    products: page?.products ?? [],
    status: getStatus(),
    totalCount: page?.totalCount ?? 0,
  };
};

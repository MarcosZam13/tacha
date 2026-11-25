import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  PRODUCT_DETAIL_STATUS,
  PRODUCT_HISTORY,
  PRODUCT_HISTORY_TEXT,
  PRODUCT_LIST_STATUS,
  PRODUCT_MORE_STATUS,
} from "../constants/finance.constants";
import type { FinanceAccessStatusType } from "../constants/finance.constants";
import type { ProductPurchaseDetailProps } from "../components/models/ProductPurchaseDetailProps.interface";
import type { ProductPurchaseListProps } from "../components/models/ProductPurchaseListProps.interface";
import type { ProductSearchProps } from "../components/models/ProductSearchProps.interface";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import type { ProductPurchaseTarget } from "../models/ProductPurchaseTarget.type";
import { formatProductCount, formatTimes } from "../utils/formatCount";
import { toProductAccessibleName, toProductDetailRow, toProductNameText } from "../utils/toProductHistoryTexts";
import { toProductTargetId } from "../utils/toProductTargetId";
import { useFinanceAccess } from "./useFinanceAccess";
import { useProductPurchases } from "./useProductPurchases";
import { usePurchasedProducts } from "./usePurchasedProducts";

/** El producto elegido, con la búsqueda vigente cuando se eligió. */
interface ProductSelection {
  /** Al cambiar la búsqueda, la selección deja de valer y el detalle se cierra (regla 93). */
  search: string;
  target: ProductPurchaseTarget;
}

interface UseProductPurchaseHistoryViewModelReturn {
  accessStatus: FinanceAccessStatusType;
  list: ProductPurchaseListProps;
  search: ProductSearchProps;
  /** Carga, vacío y cantidad de resultados, para role="status" (SPEC §9). */
  statusMessage: NullableRef<string>;
}

/**
 * ViewModel de la vista "Productos" del Historial (SCRUM-93): búsqueda con
 * espera, bloques, producto elegido y textos. La pantalla solo dibuja.
 *
 * - Un solo detalle abierto (D32): tocar el elegido lo cierra y tocar otro lo cambia.
 * - Buscar vuelve al primer bloque y cierra el detalle (regla 93).
 * - El monto es el total de la compra, con su aclaración (regla 85).
 * - Antes de reintentar se vuelve a leer la sesión (SPEC §7).
 */
export const useProductPurchaseHistoryViewModel = (): UseProductPurchaseHistoryViewModelReturn => {
  const { accessStatus, isRegistered, retryIfRegistered } = useFinanceAccess();
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selection, setSelection] = useState<NullableRef<ProductSelection>>(null);

  // Espera después de escribir: no pide un bloque por cada tecla.
  useEffect(() => {
    const timeoutId = setTimeout(() => setSearch(searchInput.trim()), PRODUCT_HISTORY.SEARCH_WAIT_MS);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const products = usePurchasedProducts(search, isRegistered);
  const selectedTarget = selection?.search === search ? selection.target : null;
  const selectedId = selectedTarget ? toProductTargetId(selectedTarget) : null;
  const detail = useProductPurchases(selectedTarget, isRegistered);

  const toggleProduct = (product: PurchasedProduct): void => {
    setSelection(toProductTargetId(product.target) === selectedId ? null : { search, target: product.target });
  };

  const buildDetail = (product: PurchasedProduct): ProductPurchaseDetailProps => {
    const nameText = toProductNameText(product);
    return {
      countText: formatTimes(product.appearanceCount),
      listLabel: `${PRODUCT_HISTORY_TEXT.DETAIL_LIST_PREFIX}${nameText}`,
      onRetry: () => void retryIfRegistered(detail.onRetry),
      purchases: detail.purchases.map((purchase) => toProductDetailRow(purchase, detail.timeZone)),
      status: detail.status,
      titleText: nameText,
    };
  };

  const getStatusMessage = (): NullableRef<string> => {
    if (detail.status === PRODUCT_DETAIL_STATUS.LOADING) return PRODUCT_HISTORY_TEXT.DETAIL_LOADING;
    if (detail.status === PRODUCT_DETAIL_STATUS.EMPTY) return PRODUCT_HISTORY_TEXT.DETAIL_EMPTY;
    if (products.moreStatus === PRODUCT_MORE_STATUS.LOADING_MORE) return PRODUCT_HISTORY_TEXT.LOADING_MORE;
    switch (products.status) {
      case PRODUCT_LIST_STATUS.LOADING:
        return PRODUCT_HISTORY_TEXT.LOADING;
      case PRODUCT_LIST_STATUS.EMPTY:
        return PRODUCT_HISTORY_TEXT.EMPTY;
      case PRODUCT_LIST_STATUS.NO_MATCHES:
        return PRODUCT_HISTORY_TEXT.NO_MATCHES;
      case PRODUCT_LIST_STATUS.READY:
        return formatProductCount(products.totalCount);
      default:
        // FAILED: el error va con role="alert" en la lista.
        return null;
    }
  };

  return {
    accessStatus,
    list: {
      hasMore: products.hasMore,
      moreStatus: products.moreStatus,
      onLoadMore: products.loadMore,
      onRetry: () => void retryIfRegistered(products.onRetry),
      onRetryMore: () => void retryIfRegistered(products.loadMore),
      rows: products.products.map((product) => {
        const id = toProductTargetId(product.target);
        const isExpanded = id === selectedId;
        return {
          accessibleName: toProductAccessibleName(product),
          countText: formatTimes(product.appearanceCount),
          detail: isExpanded ? buildDetail(product) : null,
          id,
          isExpanded,
          isUnavailable: product.name === null,
          nameText: toProductNameText(product),
          onToggle: () => toggleProduct(product),
        };
      }),
      status: products.status,
    },
    search: { onChange: setSearchInput, value: searchInput },
    statusMessage: getStatusMessage(),
  };
};

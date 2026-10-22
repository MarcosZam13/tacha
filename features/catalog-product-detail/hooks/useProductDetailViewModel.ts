import { useEffect, useState } from "react";
import { ITEM_QUANTITY } from "@/constants";
import { getCatalogVariantDetail } from "@/services/catalog.service";
import { addVariantToGeneralList, changeListItemQuantity } from "@/services/list-items.service";
import type { CatalogVariantDetail } from "@/types/catalog.types";
import type { NullableRef } from "@/types/nullable.types";
import { formatPriceRange } from "@/utils/formatPriceRange";
import { PRODUCT_DETAIL_STATUS, PRODUCT_DETAIL_TEXT } from "../constants/catalog-product-detail.constants";
import type { ProductDetailViewModel } from "../models/ProductDetailViewModel.interface";
import { toAddErrorMessage } from "../utils/toAddErrorMessage";

/** La respuesta se guarda junto al variantId que la pidió, para no mostrar
 * la respuesta de un producto viejo si variantId cambia antes de que llegue
 * (mismo patrón que useItemDetail de shopping-list). */
interface DetailResponse {
  detail: NullableRef<CatalogVariantDetail>;
  errorMessage: NullableRef<string>;
  isNotFound: boolean;
  variantId: string;
}

/**
 * Carga el detalle de una variante y arma todo lo que necesita ProductDetail
 * (plan.md §3): fetch cancelable, selector de cantidad local y el flujo de
 * "agregar a mi lista" (1 llamada a addVariantToGeneralList + cantidad−1
 * llamadas secuenciales a changeListItemQuantity, nunca en paralelo: la RPC
 * solo acepta ±1 por llamada).
 */
export const useProductDetailViewModel = (variantId: string): ProductDetailViewModel => {
  const [response, setResponse] = useState<NullableRef<DetailResponse>>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [quantity, setQuantity] = useState<number>(ITEM_QUANTITY.MIN);
  const [isAdding, setIsAdding] = useState(false);
  const [addErrorMessage, setAddErrorMessage] = useState<NullableRef<string>>(null);
  const [wasJustAdded, setWasJustAdded] = useState(false);

  useEffect(() => {
    // Si variantId cambia o se desmonta antes de que responda la base, esta
    // respuesta ya no le sirve a nadie y se ignora.
    let isCancelled = false;

    getCatalogVariantDetail(variantId)
      .then((detail) => {
        if (isCancelled) return;
        setResponse({
          detail,
          errorMessage: detail ? null : PRODUCT_DETAIL_TEXT.NOT_FOUND,
          isNotFound: detail === null,
          variantId,
        });
      })
      .catch(() => {
        if (isCancelled) return;
        setResponse({ detail: null, errorMessage: PRODUCT_DETAIL_TEXT.LOAD_ERROR, isNotFound: false, variantId });
      });

    return () => {
      isCancelled = true;
    };
    // retryToken no se usa adentro: solo fuerza que este efecto vuelva a
    // correr cuando onRetry lo incrementa, con el mismo variantId.
  }, [variantId, retryToken]);

  // Una respuesta de otro variantId no cuenta: mientras llega la de este, se está cargando.
  const currentResponse = response?.variantId === variantId ? response : null;
  const detail = currentResponse?.detail ?? null;

  const onRetry = (): void => {
    setResponse(null);
    setRetryToken((token) => token + 1);
  };

  const onIncreaseQuantity = (): void => {
    setQuantity((current) => current + 1);
  };

  const onDecreaseQuantity = (): void => {
    setQuantity((current) => Math.max(ITEM_QUANTITY.MIN, current - 1));
  };

  const onAddToList = (): void => {
    setIsAdding(true);
    setAddErrorMessage(null);
    setWasJustAdded(false);

    // addedQuantity vive fuera de addSequentially a propósito: si falla a
    // mitad de camino, el catch necesita saber cuánto quedó realmente
    // agregado (plan.md §3.5d) sin que la base lo revierta.
    let addedQuantity = 0;

    // Secuencial a propósito (plan.md §3.5b): change_item_quantity solo
    // acepta un delta de ±1 por llamada, y mandarlas en paralelo arriesga
    // que se pisen entre sí.
    const addSequentially = async (): Promise<void> => {
      const listItem = await addVariantToGeneralList(variantId);
      addedQuantity = 1;
      for (let step = 1; step < quantity; step += 1) {
        await changeListItemQuantity(listItem.id, ITEM_QUANTITY.STEP.INCREASE);
        addedQuantity += 1;
      }
    };

    addSequentially()
      .then(() => {
        setWasJustAdded(true);
      })
      .catch(() => {
        setAddErrorMessage(toAddErrorMessage(addedQuantity));
      })
      .finally(() => {
        setIsAdding(false);
      });
  };

  return {
    addErrorMessage,
    brands: detail?.brands ?? [],
    canDecreaseQuantity: quantity > ITEM_QUANTITY.MIN,
    errorMessage: currentResponse?.errorMessage ?? null,
    imageUrl: detail?.imageUrl ?? null,
    isNotFound: currentResponse?.isNotFound ?? false,
    onAddToList,
    onDecreaseQuantity,
    onIncreaseQuantity,
    onRetry,
    placeholderInitial: detail ? detail.productName.trim().charAt(0).toUpperCase() : "",
    productName: detail?.productName ?? "",
    quantity,
    sizeLabel: detail?.sizeLabel ?? "",
    status: isAdding
      ? PRODUCT_DETAIL_STATUS.ADDING
      : currentResponse === null
        ? PRODUCT_DETAIL_STATUS.LOADING
        : currentResponse.errorMessage
          ? PRODUCT_DETAIL_STATUS.ERROR
          : PRODUCT_DETAIL_STATUS.READY,
    storePriceRows: (detail?.storePriceRanges ?? []).map((range) => ({
      priceLabel: formatPriceRange(range),
      storeName: range.storeName,
      storeSlug: range.storeSlug ?? null,
    })),
    wasJustAdded,
  };
};

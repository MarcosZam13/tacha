import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ItemDetail } from "../models/ItemDetail.interface";
import { getItemDetail } from "../services/shopping-list.service";

// La respuesta se guarda junto con el variantId que la pidió, para saber de
// qué producto es cuando el usuario ya abrió otro.
interface ItemDetailResponse {
  detail: NullableRef<ItemDetail>;
  errorMessage: NullableRef<string>;
  variantId: string;
}

interface UseItemDetailReturn {
  detail: NullableRef<ItemDetail>;
  errorMessage: NullableRef<string>;
  isLoading: boolean;
}

/**
 * Pide el detalle de la variante abierta cada vez que cambia. Con null no
 * pide nada (no hay detalle abierto).
 */
export const useItemDetail = (variantId: NullableRef<string>): UseItemDetailReturn => {
  const [response, setResponse] = useState<NullableRef<ItemDetailResponse>>(null);

  useEffect(() => {
    if (!variantId) return undefined;
    // Si el usuario cierra o cambia de producto antes de que responda la
    // base, esta respuesta ya no le sirve a nadie y se ignora.
    let isCancelled = false;

    getItemDetail(variantId)
      .then((detail) => {
        if (!isCancelled) setResponse({ detail, errorMessage: null, variantId });
      })
      .catch(() => {
        if (!isCancelled) {
          setResponse({ detail: null, errorMessage: SHOPPING_LIST_TEXT.DETAIL_ERROR, variantId });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [variantId]);

  // Una respuesta de otra variante no cuenta: mientras llega la de esta, se está cargando.
  const currentResponse = response?.variantId === variantId ? response : null;

  return {
    detail: currentResponse?.detail ?? null,
    errorMessage: currentResponse?.errorMessage ?? null,
    isLoading: variantId !== null && currentResponse === null,
  };
};

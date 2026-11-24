import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { PRODUCT_GROUPS_STATUS, PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";
import type { ProductGroupsStatusType } from "../constants/product-groups.constants";
import type { ProductGroupsResponse, ProductGroupsViewModel } from "../models/product-groups.interfaces";
import { listProductGroups } from "../services/product-groups.service";
import { toProductGroupCards } from "../utils/toProductGroupCards";

/** Estado de la pantalla según la última respuesta (null = todavía no llegó). */
const resolveStatus = (response: NullableRef<ProductGroupsResponse>, groupCount: number): ProductGroupsStatusType => {
  if (response === null) return PRODUCT_GROUPS_STATUS.LOADING;
  if (response.errorMessage !== null) return PRODUCT_GROUPS_STATUS.ERROR;
  if (groupCount === 0) return PRODUCT_GROUPS_STATUS.EMPTY;
  return PRODUCT_GROUPS_STATUS.READY;
};

/**
 * Pantalla "Mis grupos": se pide una sola vez al montar (servicio + efecto,
 * mismo patrón que useMyProductsViewModel). `reload()` vuelve a `loading` y
 * repite el pedido; lo usa "Reintentar".
 */
export const useProductGroupsViewModel = (): ProductGroupsViewModel => {
  const [response, setResponse] = useState<NullableRef<ProductGroupsResponse>>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    listProductGroups()
      .then((groups) => {
        if (!isCancelled) setResponse({ errorMessage: null, groups });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ errorMessage: PRODUCT_GROUPS_TEXT.ERROR, groups: [] });
      });

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const groups = toProductGroupCards(response?.groups ?? []);

  return {
    errorMessage: response?.errorMessage ?? null,
    groups,
    reload: () => {
      setResponse(null);
      setRefreshKey((key) => key + 1);
    },
    status: resolveStatus(response, groups.length),
  };
};

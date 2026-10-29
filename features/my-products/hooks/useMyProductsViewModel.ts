import { useEffect, useState } from "react";
import { toCatalogCards } from "@/utils/toCatalogCards";
import type { CatalogProduct } from "@/types/catalog.types";
import type { NullableRef } from "@/types/nullable.types";
import { MY_PRODUCTS_STATUS, MY_PRODUCTS_TEXT } from "../constants/my-products.constants";
import type { MyProductsViewModel } from "../models/my-products.interfaces";
import { listMyProducts } from "../services/my-products.service";

interface MyProductsResponse {
  errorMessage: NullableRef<string>;
  products: CatalogProduct[];
}

/**
 * Pantalla "Mis productos". A diferencia de "Buscar" (useProductSearch), acá
 * no hay nada que escribir: se busca una sola vez al montar (patrón
 * servicio + efecto de nextjs-enterprise-patterns §3).
 *
 * `reload()` (HU-56, SCRUM-87): vuelve a pedir el listado tras crear un
 * producto con éxito, para que se vea de inmediato sin recargar la página
 * (SPEC.md §4). Pasa por el mismo camino que el montaje inicial: vuelve a
 * `loading` mientras responde, en vez de actualizar las tarjetas a mitad de camino.
 */
export const useMyProductsViewModel = (): MyProductsViewModel => {
  const [response, setResponse] = useState<NullableRef<MyProductsResponse>>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    listMyProducts()
      .then((products) => {
        if (!isCancelled) setResponse({ errorMessage: null, products });
      })
      .catch(() => {
        if (!isCancelled) {
          setResponse({ errorMessage: MY_PRODUCTS_TEXT.ERROR, products: [] });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const cards = toCatalogCards(response?.products ?? [], MY_PRODUCTS_TEXT.BADGE_LABEL);

  return {
    cards,
    errorMessage: response?.errorMessage ?? null,
    reload: () => {
      setResponse(null);
      setRefreshKey((key) => key + 1);
    },
    status:
      response === null
        ? MY_PRODUCTS_STATUS.LOADING
        : response.errorMessage !== null
          ? MY_PRODUCTS_STATUS.ERROR
          : cards.length === 0
            ? MY_PRODUCTS_STATUS.EMPTY
            : MY_PRODUCTS_STATUS.READY,
  };
};

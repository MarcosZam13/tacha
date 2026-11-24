import { useEffect, useState } from "react";
import { toCatalogCards } from "@/utils/toCatalogCards";
import type { NullableRef } from "@/types/nullable.types";
import { MY_PRODUCTS_STATUS, MY_PRODUCTS_TEXT } from "../constants/my-products.constants";
import type { MyProduct, MyProductCardItem, MyProductsViewModel } from "../models/my-products.interfaces";
import { listMyProducts } from "../services/my-products.service";
import { useMyProductDeletion } from "./useMyProductDeletion";

interface MyProductsResponse {
  errorMessage: NullableRef<string>;
  products: MyProduct[];
}

// HU-58: cada tarjeta (una por variante) lleva el producto al que apuntan sus
// botones de editar y eliminar.
const toCardItems = (products: MyProduct[]): MyProductCardItem[] =>
  products.flatMap((product) =>
    toCatalogCards([product], MY_PRODUCTS_TEXT.BADGE_LABEL).map((card) => ({ card, product: product.editable })),
  );

/**
 * Pantalla "Mis productos". A diferencia de "Buscar" (useProductSearch), acá
 * no hay nada que escribir: se busca una sola vez al montar (patrón
 * servicio + efecto de nextjs-enterprise-patterns §3).
 *
 * `reload()` (HU-56, SCRUM-87): vuelve a pedir el listado tras crear un
 * producto con éxito, para que se vea de inmediato sin recargar la página
 * (SPEC.md §4). Pasa por el mismo camino que el montaje inicial: vuelve a
 * `loading` mientras responde, en vez de actualizar las tarjetas a mitad de camino.
 * HU-58 (SCRUM-89): también lo usan editar y eliminar.
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

  const items = toCardItems(response?.products ?? []);

  const reload = (): void => {
    setResponse(null);
    setRefreshKey((key) => key + 1);
  };

  const deletion = useMyProductDeletion({ onDeleted: reload });

  return {
    deletion,
    errorMessage: response?.errorMessage ?? null,
    items,
    reload,
    status:
      response === null
        ? MY_PRODUCTS_STATUS.LOADING
        : response.errorMessage !== null
          ? MY_PRODUCTS_STATUS.ERROR
          : items.length === 0
            ? MY_PRODUCTS_STATUS.EMPTY
            : MY_PRODUCTS_STATUS.READY,
  };
};

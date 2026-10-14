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
 */
export const useMyProductsViewModel = (): MyProductsViewModel => {
  const [response, setResponse] = useState<NullableRef<MyProductsResponse>>(null);

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
  }, []);

  const cards = toCatalogCards(response?.products ?? [], MY_PRODUCTS_TEXT.BADGE_LABEL);

  return {
    cards,
    errorMessage: response?.errorMessage ?? null,
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

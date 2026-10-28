import { useEffect, useState } from "react";
import { PRODUCT_SEARCH, PRODUCT_SEARCH_TEXT } from "@/constants";
import { useProductSearch } from "@/hooks/useProductSearch";
import { getCategories, listCatalogByCategory } from "@/services/catalog.service";
import type { CatalogProduct, Category } from "@/types/catalog.types";
import type { NullableRef } from "@/types/nullable.types";
import { toCatalogCards } from "@/utils/toCatalogCards";
import type { CatalogSearchViewModel } from "../models/catalog-search.interfaces";
import { getCatalogSearchStatus } from "../utils/getCatalogSearchStatus";

/** Respuesta del listado por categoría, guardada junto a la categoría que la pidió. */
interface CategoryListingResponse {
  categoryId: string;
  errorMessage: NullableRef<string>;
  products: CatalogProduct[];
}

/**
 * Pantalla "Buscar" del catálogo. La búsqueda por texto (debounce, mínimo de
 * letras, descartar respuestas viejas) ya la resuelve useProductSearch; este
 * hook agrega el filtro por categoría (HU-52) y decide, según la tabla de
 * casos de plan.md, si lo que se dibuja viene de search_catalog,
 * list_catalog_by_category, o de ninguna (idle). No guarda más estado del
 * que no se puede derivar: las tarjetas y el status se calculan en cada render.
 */
export const useCatalogSearchViewModel = (): CatalogSearchViewModel => {
  const search = useProductSearch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<NullableRef<string>>(null);
  const [categoryResponse, setCategoryResponse] = useState<NullableRef<CategoryListingResponse>>(null);

  // Las 7 categorías para los chips; se piden una sola vez. Lectura pública,
  // así que un fallo no bloquea el resto de la pantalla: los chips quedan
  // vacíos y la búsqueda por texto (HU-51) sigue funcionando igual.
  useEffect(() => {
    let isCancelled = false;
    getCategories()
      .then((result) => {
        if (!isCancelled) setCategories(result);
      })
      .catch(() => undefined);
    return () => {
      isCancelled = true;
    };
  }, []);

  const term = search.query.trim().slice(0, PRODUCT_SEARCH.MAX_QUERY_LENGTH);
  const isTermSearchable = term.length >= PRODUCT_SEARCH.MIN_QUERY_LENGTH;

  // Listado por categoría (sin texto buscable): solo se pide cuando hay un
  // chip activo, nunca al entrar a la pantalla (regla 13 de SPEC.md §5).
  useEffect(() => {
    if (isTermSearchable || activeCategoryId === null) return undefined;

    let isCancelled = false;
    listCatalogByCategory(activeCategoryId)
      .then((products) => {
        if (!isCancelled) setCategoryResponse({ categoryId: activeCategoryId, errorMessage: null, products });
      })
      .catch(() => {
        if (!isCancelled) {
          setCategoryResponse({
            categoryId: activeCategoryId,
            errorMessage: PRODUCT_SEARCH_TEXT.SEARCH_ERROR,
            products: [],
          });
        }
      });
    return () => {
      // Cambiar de chip (o escribir texto buscable) descarta una respuesta
      // tardía del chip anterior (regla 15 de SPEC.md §5).
      isCancelled = true;
    };
  }, [activeCategoryId, isTermSearchable]);

  // La respuesta guardada solo vale si es la de la categoría activa ahora.
  const currentCategoryResponse =
    !isTermSearchable && categoryResponse?.categoryId === activeCategoryId ? categoryResponse : null;
  const isCategoryLoading = !isTermSearchable && activeCategoryId !== null && currentCategoryResponse === null;

  const activeCategoryName = categories.find((category) => category.id === activeCategoryId)?.name;

  // Tabla de decisión (plan.md#qué-rpc-decide-el-viewmodel-tabla-de-casos).
  const products: CatalogProduct[] = isTermSearchable
    ? activeCategoryId === null
      ? search.results
      : search.results.filter((product) => product.category === activeCategoryName)
    : (currentCategoryResponse?.products ?? []);

  const cards = toCatalogCards(products);
  const isSearching = isTermSearchable ? search.isSearching : isCategoryLoading;
  const errorMessage = isTermSearchable ? search.errorMessage : (currentCategoryResponse?.errorMessage ?? null);
  const isAnyFilterActive = isTermSearchable || activeCategoryId !== null;

  return {
    activeCategoryId,
    cards,
    categories,
    errorMessage,
    onCategoryChange: setActiveCategoryId,
    onQueryChange: search.setQuery,
    query: search.query,
    status: getCatalogSearchStatus({
      hasError: errorMessage !== null,
      hasNoResults: isAnyFilterActive && !isSearching && errorMessage === null && cards.length === 0,
      hasResults: cards.length > 0,
      isSearching,
    }),
  };
};

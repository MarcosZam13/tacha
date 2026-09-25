import { useEffect, useState } from "react";
import { PRODUCT_SEARCH, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import { searchCatalog } from "../services/catalog.service";
import type { NullableRef } from "@/types/nullable.types";

/** Respuesta de la base, guardada junto al término que la pidió. */
interface SearchResponse {
  errorMessage: NullableRef<string>;
  results: CatalogSearchResult[];
  term: string;
}

interface UseProductSearchReturn {
  clearQuery: () => void;
  errorMessage: NullableRef<string>;
  hasNoResults: boolean;
  isSearching: boolean;
  query: string;
  results: CatalogSearchResult[];
  setQuery: (query: string) => void;
}

/**
 * Buscador con debounce. Solo se guarda en estado lo que no se puede
 * calcular: el texto del input y la última respuesta. Si hay resultados,
 * si está buscando o si no hubo coincidencias se deriva en cada render.
 */
export const useProductSearch = (): UseProductSearchReturn => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<NullableRef<SearchResponse>>(null);

  const term = query.trim().slice(0, PRODUCT_SEARCH.MAX_QUERY_LENGTH);
  const isTermSearchable = term.length >= PRODUCT_SEARCH.MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isTermSearchable) return undefined;

    let isCancelled = false;
    // Debounce: solo se busca cuando el usuario deja de escribir DEBOUNCE_MS.
    // Cada tecla nueva corre el cleanup, que cancela el timer anterior.
    const timerId = setTimeout(() => {
      searchCatalog(term)
        .then((results) => {
          if (!isCancelled) setResponse({ errorMessage: null, results, term });
        })
        .catch(() => {
          if (!isCancelled) {
            setResponse({ errorMessage: SHOPPING_LIST_TEXT.SEARCH_ERROR, results: [], term });
          }
        });
    }, PRODUCT_SEARCH.DEBOUNCE_MS);

    return () => {
      clearTimeout(timerId);
      // Una respuesta de un término viejo que llegue tarde ya no pisa a la nueva.
      isCancelled = true;
    };
  }, [term, isTermSearchable]);

  // La respuesta solo vale si es del término que está escrito ahora.
  const currentResponse = isTermSearchable && response?.term === term ? response : null;

  return {
    clearQuery: () => setQuery(""),
    errorMessage: currentResponse?.errorMessage ?? null,
    hasNoResults: currentResponse !== null && !currentResponse.errorMessage && currentResponse.results.length === 0,
    isSearching: isTermSearchable && currentResponse === null,
    query,
    results: currentResponse?.results ?? [],
    setQuery,
  };
};

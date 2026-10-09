import { useProductSearch } from "@/hooks/useProductSearch";
import type { CatalogSearchViewModel } from "../models/catalog-search.interfaces";
import { getCatalogSearchStatus } from "../utils/getCatalogSearchStatus";
import { toCatalogCards } from "../utils/toCatalogCards";

/**
 * Pantalla "Buscar" del catálogo. La búsqueda en sí (debounce, mínimo de
 * letras, descartar respuestas viejas) ya la resuelve useProductSearch; este
 * hook solo adapta sus resultados a tarjetas y decide en qué estado está la
 * pantalla. No guarda estado propio: todo se deriva en cada render.
 */
export const useCatalogSearchViewModel = (): CatalogSearchViewModel => {
  const search = useProductSearch();
  const cards = toCatalogCards(search.results);

  return {
    cards,
    errorMessage: search.errorMessage,
    onQueryChange: search.setQuery,
    query: search.query,
    status: getCatalogSearchStatus({
      hasError: search.errorMessage !== null,
      hasNoResults: search.hasNoResults,
      hasResults: cards.length > 0,
      isSearching: search.isSearching,
    }),
  };
};

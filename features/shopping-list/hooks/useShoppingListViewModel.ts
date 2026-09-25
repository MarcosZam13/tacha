import type { NullableRef } from "@/types/nullable.types";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { useProductSearch } from "./useProductSearch";
import { useShoppingList } from "./useShoppingList";

interface UseShoppingListViewModelReturn {
  addErrorMessage: NullableRef<string>;
  canAddItems: boolean;
  hasItems: boolean;
  hasNoSearchResults: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  isSearching: boolean;
  items: ShoppingListItem[];
  loadErrorMessage: NullableRef<string>;
  onQueryChange: (query: string) => void;
  onSelectResult: (searchResult: CatalogSearchResult) => void;
  query: string;
  searchErrorMessage: NullableRef<string>;
  searchResults: CatalogSearchResult[];
}

/**
 * Facade de la pantalla: une la lista y el buscador y le entrega a
 * ShoppingList.tsx exactamente lo que dibuja, ya calculado.
 */
export const useShoppingListViewModel = (): UseShoppingListViewModelReturn => {
  const { addItem, state } = useShoppingList();
  const search = useProductSearch();

  const onSelectResult = (searchResult: CatalogSearchResult): void => {
    search.clearQuery();
    // addItem maneja su propio error (lo pasa al estado), por eso no se espera acá.
    void addItem(searchResult);
  };

  return {
    addErrorMessage: state.addErrorMessage,
    // Si la lista no se pudo cargar no se ofrece añadir: la pantalla mostraría
    // solo lo recién añadido como si fuera toda la lista.
    canAddItems: !state.loadErrorMessage,
    hasItems: state.items.length > 0,
    hasNoSearchResults: search.hasNoResults,
    // Con error de carga no se dice "tu lista está vacía": no se sabe si lo está.
    isEmpty: !state.isLoading && !state.loadErrorMessage && state.items.length === 0,
    isLoading: state.isLoading,
    isSearching: search.isSearching,
    items: state.items,
    loadErrorMessage: state.loadErrorMessage,
    onQueryChange: search.setQuery,
    onSelectResult,
    query: search.query,
    searchErrorMessage: search.errorMessage,
    searchResults: search.results,
  };
};

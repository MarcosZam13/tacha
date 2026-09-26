import type { NullableRef } from "@/types/nullable.types";
import { ITEM_QUANTITY } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ShoppingListRowViewModel } from "../models/ShoppingListRowViewModel.interface";
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
  loadErrorMessage: NullableRef<string>;
  onDecreaseQuantity: (itemId: string) => void;
  onIncreaseQuantity: (itemId: string) => void;
  onQueryChange: (query: string) => void;
  onSelectResult: (searchResult: CatalogSearchResult) => void;
  quantityErrorMessage: NullableRef<string>;
  query: string;
  rows: ShoppingListRowViewModel[];
  searchErrorMessage: NullableRef<string>;
  searchResults: CatalogSearchResult[];
}

/**
 * Facade de la pantalla: une la lista y el buscador y le entrega a
 * ShoppingList.tsx exactamente lo que dibuja, ya calculado.
 */
export const useShoppingListViewModel = (): UseShoppingListViewModelReturn => {
  const { addItem, changeQuantity, state } = useShoppingList();
  const search = useProductSearch();

  const onSelectResult = (searchResult: CatalogSearchResult): void => {
    search.clearQuery();
    const listedItem = state.items.find((item) => item.variantId === searchResult.variantId);
    if (!listedItem) {
      // addItem maneja su propio error (lo pasa al estado), por eso no se espera acá.
      void addItem(searchResult);
      return;
    }
    // Ya está en la lista: es el mismo +1 que el botón, y pasa por el mismo
    // bloqueo por fila. Si la fila espera respuesta se ignora, como el botón
    // deshabilitado; si no, dos escrituras en paralelo podrían dejar en
    // pantalla una cantidad vieja.
    if (state.pendingItemIds.includes(listedItem.id)) return;
    void changeQuantity(listedItem.id, ITEM_QUANTITY.STEP.INCREASE);
  };

  // changeQuantity también maneja su propio error, por eso tampoco se espera.
  const onIncreaseQuantity = (itemId: string): void => {
    void changeQuantity(itemId, ITEM_QUANTITY.STEP.INCREASE);
  };

  const onDecreaseQuantity = (itemId: string): void => {
    void changeQuantity(itemId, ITEM_QUANTITY.STEP.DECREASE);
  };

  const rows = state.items.map((item) => {
    const isPending = state.pendingItemIds.includes(item.id);
    return {
      canDecrease: !isPending && item.quantity > ITEM_QUANTITY.MIN,
      canIncrease: !isPending,
      item,
    };
  });

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
    loadErrorMessage: state.loadErrorMessage,
    onDecreaseQuantity,
    onIncreaseQuantity,
    onQueryChange: search.setQuery,
    onSelectResult,
    quantityErrorMessage: state.quantityErrorMessage,
    query: search.query,
    rows,
    searchErrorMessage: search.errorMessage,
    searchResults: search.results,
  };
};

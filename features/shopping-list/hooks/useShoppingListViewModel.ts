import { useState } from "react";
import type { ProductSearchOption } from "@/components/product-search/models/ProductSearchOption.interface";
import { useProductSearch } from "@/hooks/useProductSearch";
import type { NullableRef } from "@/types/nullable.types";
import { ITEM_QUANTITY } from "../constants/shopping-list.constants";
import type { ItemDetailViewModel } from "../models/ItemDetailViewModel.interface";
import type { ShoppingListRowViewModel } from "../models/ShoppingListRowViewModel.interface";
import { formatPriceRange } from "../utils/formatPriceRange";
import { toCatalogSearchResults } from "../utils/toCatalogSearchResults";
import { toStorePriceRanges } from "../utils/toStorePriceRanges";
import { useItemDetail } from "./useItemDetail";
import { useShoppingList } from "./useShoppingList";

interface UseShoppingListViewModelReturn {
  addErrorMessage: NullableRef<string>;
  canAddItems: boolean;
  detail: NullableRef<ItemDetailViewModel>;
  hasItems: boolean;
  hasNoSearchResults: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  isSearching: boolean;
  loadErrorMessage: NullableRef<string>;
  onCloseDetail: () => void;
  onDecreaseQuantity: (itemId: string) => void;
  onIncreaseQuantity: (itemId: string) => void;
  onOpenDetail: (itemId: string) => void;
  onQueryChange: (query: string) => void;
  onSelectSearchOption: (variantId: string) => void;
  quantityErrorMessage: NullableRef<string>;
  query: string;
  rows: ShoppingListRowViewModel[];
  searchErrorMessage: NullableRef<string>;
  searchOptions: ProductSearchOption[];
}

/**
 * Facade de la pantalla: une la lista y el buscador y le entrega a
 * ShoppingList.tsx exactamente lo que dibuja, ya calculado.
 */
export const useShoppingListViewModel = (): UseShoppingListViewModelReturn => {
  const { addItem, changeQuantity, state } = useShoppingList();
  const search = useProductSearch();
  // Se guarda solo el id de la fila abierta; la fila en sí se busca en la
  // lista, así el modal siempre muestra la cantidad y el nombre actuales.
  const [openItemId, setOpenItemId] = useState<NullableRef<string>>(null);
  const openItem = state.items.find((item) => item.id === openItemId) ?? null;
  const itemDetail = useItemDetail(openItem?.variantId ?? null);
  // El buscador devuelve productos madre; la lista añade variantes.
  const searchResults = toCatalogSearchResults(search.results);

  const onSelectSearchOption = (variantId: string): void => {
    const searchResult = searchResults.find((result) => result.variantId === variantId);
    if (!searchResult) return;
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

  const onOpenDetail = (itemId: string): void => {
    setOpenItemId(itemId);
  };

  const onCloseDetail = (): void => {
    setOpenItemId(null);
  };

  const detail = openItem
    ? {
        // Sin repetidos: el scraper puede guardar la misma marca dos veces para una variante.
        brands: [...new Set(itemDetail.detail?.brands ?? [])],
        errorMessage: itemDetail.errorMessage,
        isLoading: itemDetail.isLoading,
        priceRows: toStorePriceRanges(itemDetail.detail?.storePrices ?? []).map((range) => ({
          priceLabel: formatPriceRange(range),
          storeName: range.storeName,
        })),
        productName: openItem.productName,
        sizeLabel: openItem.sizeLabel,
      }
    : null;

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
    detail,
    hasItems: state.items.length > 0,
    hasNoSearchResults: search.hasNoResults,
    // Con error de carga no se dice "tu lista está vacía": no se sabe si lo está.
    isEmpty: !state.isLoading && !state.loadErrorMessage && state.items.length === 0,
    isLoading: state.isLoading,
    isSearching: search.isSearching,
    loadErrorMessage: state.loadErrorMessage,
    onCloseDetail,
    onDecreaseQuantity,
    onIncreaseQuantity,
    onOpenDetail,
    onQueryChange: search.setQuery,
    onSelectSearchOption,
    quantityErrorMessage: state.quantityErrorMessage,
    query: search.query,
    rows,
    searchErrorMessage: search.errorMessage,
    searchOptions: searchResults.map((result) => ({
      detail: result.sizeLabel,
      id: result.variantId,
      label: result.productName,
    })),
  };
};

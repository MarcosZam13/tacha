import { useState } from "react";
import type { ProductSearchOption } from "@/components/product-search/models/ProductSearchOption.interface";
import { useProductSearch } from "@/hooks/useProductSearch";
import type { NullableRef } from "@/types/nullable.types";
import { formatPriceRange } from "@/utils/formatPriceRange";
import { ITEM_QUANTITY } from "../constants/shopping-list.constants";
import type { ItemDetailViewModel } from "../models/ItemDetailViewModel.interface";
import type { ShoppingListRowViewModel } from "../models/ShoppingListRowViewModel.interface";
import { toCatalogSearchResults } from "../utils/toCatalogSearchResults";
import { toStorePriceRanges } from "../utils/toStorePriceRanges";
import { useItemDetail } from "./useItemDetail";
import { useItemRemoval } from "./useItemRemoval";
import { useShoppingList } from "./useShoppingList";

interface UseShoppingListViewModelReturn {
  addErrorMessage: NullableRef<string>;
  canAddItems: boolean;
  checkErrorMessage: NullableRef<string>;
  /** Sección "Tachados hoy", en el orden en que se añadieron. */
  checkedRows: ShoppingListRowViewModel[];
  detail: NullableRef<ItemDetailViewModel>;
  hasCheckedRows: boolean;
  hasItems: boolean;
  hasNoSearchResults: boolean;
  hasPendingRows: boolean;
  /** Hay filas pero todas están tachadas: "Pendientes" muestra un texto en vez de quedar vacía. */
  isAllChecked: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  isSearching: boolean;
  /** true mientras se puede deshacer el último eliminado (el toast está visible). */
  isUndoRemoveVisible: boolean;
  loadErrorMessage: NullableRef<string>;
  onCloseDetail: () => void;
  onDecreaseQuantity: (itemId: string) => void;
  onIncreaseQuantity: (itemId: string) => void;
  onOpenDetail: (itemId: string) => void;
  onQueryChange: (query: string) => void;
  onRemoveItem: (itemId: string) => void;
  onSelectSearchOption: (variantId: string) => void;
  onToggleChecked: (itemId: string) => void;
  onUndoRemove: () => void;
  /** Sección "Pendientes", en el orden en que se añadieron. */
  pendingRows: ShoppingListRowViewModel[];
  quantityErrorMessage: NullableRef<string>;
  query: string;
  removeErrorMessage: NullableRef<string>;
  searchErrorMessage: NullableRef<string>;
  searchOptions: ProductSearchOption[];
}

/**
 * Facade de la pantalla: une la lista y el buscador y le entrega a
 * ShoppingList.tsx exactamente lo que dibuja, ya calculado.
 */
export const useShoppingListViewModel = (): UseShoppingListViewModelReturn => {
  const { addItem, changeQuantity, removeItem, state, toggleChecked } = useShoppingList();
  const search = useProductSearch();
  const removal = useItemRemoval({ removeItem });
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
    // Volver a añadir lo que tiene el toast de eliminado es deshacer: sigue
    // en la base, así que se recupera y recibe el mismo +1 de abajo.
    if (listedItem.id === removal.undoItemId) removal.cancelRemoval();
    // Si ya se está borrando en la base se ignora, igual que una fila que espera respuesta.
    else if (removal.hiddenItemIds.includes(listedItem.id)) return;
    // Ya está en la lista: es el mismo +1 que el botón, y pasa por el mismo
    // bloqueo por fila. Si la fila espera respuesta se ignora, como el botón
    // deshabilitado; si no, dos escrituras en paralelo podrían dejar en
    // pantalla una cantidad vieja.
    if (state.pendingItemIds.includes(listedItem.id)) return;
    // Tachada: es una compra nueva. La RPC de añadir la reabre con cantidad 1
    // (migración 015) en vez de sumarle a lo que ya se compró.
    if (listedItem.checkedAt) {
      void addItem(searchResult);
      return;
    }
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

  // El estado nuevo sale de lo que la fila muestra: tachada → destachar.
  const onToggleChecked = (itemId: string): void => {
    const item = state.items.find((listedItem) => listedItem.id === itemId);
    // Fila esperando respuesta: se ignora, igual que el botón deshabilitado.
    if (!item || state.pendingItemIds.includes(itemId)) return;
    void toggleChecked(itemId, item.checkedAt === null);
  };

  const onRemoveItem = (itemId: string): void => {
    removal.requestRemoval(itemId);
  };

  // Una fila eliminada no sale de state.items hasta que la base confirma;
  // mientras tanto solo se deja de mostrar.
  const rows = state.items
    .filter((item) => !removal.hiddenItemIds.includes(item.id))
    .map((item) => {
      const isPending = state.pendingItemIds.includes(item.id);
      return {
        canDecrease: !isPending && item.quantity > ITEM_QUANTITY.MIN,
        canIncrease: !isPending,
        // Mientras la cantidad se guarda no se elimina: la respuesta podría llegar después del borrado.
        canRemove: !isPending,
        canToggleChecked: !isPending,
        isChecked: item.checkedAt !== null,
        item,
      };
    });
  // Las dos secciones salen del mismo arreglo, filtrado: cada una conserva el
  // orden en que se añadieron y una fila destachada vuelve a su lugar.
  const pendingRows = rows.filter((row) => !row.isChecked);
  const checkedRows = rows.filter((row) => row.isChecked);

  return {
    addErrorMessage: state.addErrorMessage,
    // Si la lista no se pudo cargar no se ofrece añadir: la pantalla mostraría
    // solo lo recién añadido como si fuera toda la lista.
    canAddItems: !state.loadErrorMessage,
    checkErrorMessage: state.checkErrorMessage,
    checkedRows,
    detail,
    hasCheckedRows: checkedRows.length > 0,
    hasItems: rows.length > 0,
    hasNoSearchResults: search.hasNoResults,
    hasPendingRows: pendingRows.length > 0,
    isAllChecked: rows.length > 0 && pendingRows.length === 0,
    // Con error de carga no se dice "tu lista está vacía": no se sabe si lo está.
    isEmpty: !state.isLoading && !state.loadErrorMessage && rows.length === 0,
    isLoading: state.isLoading,
    isSearching: search.isSearching,
    isUndoRemoveVisible: removal.undoItemId !== null,
    loadErrorMessage: state.loadErrorMessage,
    onCloseDetail,
    onDecreaseQuantity,
    onIncreaseQuantity,
    onOpenDetail,
    onQueryChange: search.setQuery,
    onRemoveItem,
    onSelectSearchOption,
    onToggleChecked,
    onUndoRemove: removal.cancelRemoval,
    pendingRows,
    quantityErrorMessage: state.quantityErrorMessage,
    query: search.query,
    removeErrorMessage: state.removeErrorMessage,
    searchErrorMessage: search.errorMessage,
    searchOptions: searchResults.map((result) => ({
      detail: result.sizeLabel,
      id: result.variantId,
      label: result.productName,
    })),
  };
};

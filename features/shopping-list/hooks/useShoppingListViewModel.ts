import { useState } from "react";
import type { ProductSearchOption } from "@/components/product-search/models/ProductSearchOption.interface";
import { useProductSearch } from "@/hooks/useProductSearch";
import type { NullableRef } from "@/types/nullable.types";
import { formatPriceRange } from "@/utils/formatPriceRange";
import { ITEM_QUANTITY } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { ClosePurchaseViewModel } from "../models/ClosePurchaseViewModel.interface";
import type { ItemDetailViewModel } from "../models/ItemDetailViewModel.interface";
import type { ShoppingListRowViewModel } from "../models/ShoppingListRowViewModel.interface";
import type { StorePickerViewModel } from "../models/StorePickerViewModel.interface";
import { toCatalogSearchResults } from "../utils/toCatalogSearchResults";
import { isBoughtInSession, toShoppingListRow } from "../utils/toShoppingListRow";
import { toStorePriceRanges } from "../utils/toStorePriceRanges";
import { useClosePurchase } from "./useClosePurchase";
import { useItemDetail } from "./useItemDetail";
import { useItemRemoval } from "./useItemRemoval";
import { usePurchaseSession } from "./usePurchaseSession";
import { useShoppingList } from "./useShoppingList";
import { useStorePicker } from "./useStorePicker";

interface UseShoppingListViewModelReturn {
  /** Súper de la compra activa; null fuera de modo compra (SCRUM-67). */
  activeStoreName: NullableRef<string>;
  addErrorMessage: NullableRef<string>;
  canAddItems: boolean;
  /** "Iniciar compra" se ofrece fuera de modo compra y con algo en la lista. */
  canStartPurchase: boolean;
  checkErrorMessage: NullableRef<string>;
  /** Sección "Tachados hoy", en el orden en que se añadieron. */
  checkedRows: ShoppingListRowViewModel[];
  closePurchase: ClosePurchaseViewModel;
  detail: NullableRef<ItemDetailViewModel>;
  hasCheckedRows: boolean;
  hasItems: boolean;
  hasNoSearchResults: boolean;
  /** Hay filas pero todas están tachadas: "Pendientes" muestra un texto en vez de filas. */
  isAllChecked: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  isSearching: boolean;
  /** true mientras se puede deshacer el último eliminado (el toast está visible). */
  isUndoRemoveVisible: boolean;
  loadErrorMessage: NullableRef<string>;
  onCloseDetail: () => void;
  onDecreaseQuantity: (itemId: string) => void;
  onExitShoppingMode: () => void;
  onIncreaseQuantity: (itemId: string) => void;
  onOpenDetail: (itemId: string) => void;
  onQueryChange: (query: string) => void;
  onRemoveItem: (itemId: string) => void;
  onRequestClosePurchase: () => void;
  onSelectSearchOption: (variantId: string) => void;
  onStartPurchase: () => void;
  onToggleChecked: (itemId: string) => void;
  onUndoRemove: () => void;
  /** Sección "Pendientes", en el orden en que se añadieron. */
  pendingRows: ShoppingListRowViewModel[];
  quantityErrorMessage: NullableRef<string>;
  query: string;
  removeErrorMessage: NullableRef<string>;
  searchErrorMessage: NullableRef<string>;
  searchOptions: ProductSearchOption[];
  /** Aviso cuando la compra de la URL no está abierta. */
  sessionNoticeMessage: NullableRef<string>;
  storePicker: StorePickerViewModel;
}

/**
 * Facade de la pantalla: une la lista, el buscador y el modo compra y le
 * entrega a ShoppingListInner.tsx exactamente lo que dibuja, ya calculado.
 */
export const useShoppingListViewModel = (): UseShoppingListViewModelReturn => {
  const { addItem, changeBoughtQuantity, changeQuantity, removeItem, state, toggleChecked } = useShoppingList();
  const search = useProductSearch();
  const removal = useItemRemoval({ removeItem });
  const purchase = usePurchaseSession();
  const storePicker = useStorePicker({ onStarted: purchase.enterShoppingMode });
  const activeSessionId = purchase.activeSession?.id ?? null;
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
    if (listedItem.checkedAt !== null) {
      void addItem(searchResult);
      return;
    }
    void changeQuantity(listedItem.id, ITEM_QUANTITY.STEP.INCREASE);
  };

  // El mismo "−"/"+" cambia lo pedido o, en una fila comprada en esta compra,
  // lo comprado. Los dos manejan su propio error, por eso no se esperan.
  const changeDisplayedQuantity = (itemId: string, quantityStep: ItemQuantityStepType): void => {
    const item = state.items.find((listedItem) => listedItem.id === itemId);
    if (!item) return;
    // En modo compra, una fila tachada en ESTA compra ajusta lo comprado (SCRUM-67, regla 16).
    if (isBoughtInSession(item, activeSessionId)) void changeBoughtQuantity(itemId, quantityStep);
    else void changeQuantity(itemId, quantityStep);
  };

  const onIncreaseQuantity = (itemId: string): void => {
    changeDisplayedQuantity(itemId, ITEM_QUANTITY.STEP.INCREASE);
  };

  const onDecreaseQuantity = (itemId: string): void => {
    changeDisplayedQuantity(itemId, ITEM_QUANTITY.STEP.DECREASE);
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
    toggleChecked(itemId, item.checkedAt === null, activeSessionId);
  };

  const onRemoveItem = (itemId: string): void => {
    removal.requestRemoval(itemId);
  };

  // Una fila eliminada no sale de state.items hasta que la base confirma;
  // mientras tanto solo se deja de mostrar.
  const rows = state.items
    .filter((item) => !removal.hiddenItemIds.includes(item.id))
    .map((item) =>
      toShoppingListRow({ activeSessionId, isPending: state.pendingItemIds.includes(item.id), item }),
    );
  // Las dos secciones salen del mismo arreglo, filtrado: cada una conserva el
  // orden en que se añadieron y una fila destachada vuelve a su lugar.
  const pendingRows = rows.filter((row) => !row.isChecked);
  const checkedRows = rows.filter((row) => row.isChecked);
  const isAllChecked = rows.length > 0 && pendingRows.length === 0;
  const closePurchase = useClosePurchase({
    isAllChecked,
    onClosed: purchase.leaveClosedSession,
    sessionId: activeSessionId,
  });

  return {
    activeStoreName: purchase.activeSession?.storeName ?? null,
    addErrorMessage: state.addErrorMessage,
    // Si la lista no se pudo cargar no se ofrece añadir: la pantalla mostraría
    // solo lo recién añadido como si fuera toda la lista.
    canAddItems: !state.loadErrorMessage,
    canStartPurchase:
      !purchase.activeSession && !purchase.isLoadingSession && !state.loadErrorMessage && rows.length > 0,
    checkErrorMessage: state.checkErrorMessage,
    checkedRows,
    closePurchase: {
      closeErrorMessage: closePurchase.closeErrorMessage,
      isAllChecked,
      isClosing: closePurchase.isClosing,
      isVisible: closePurchase.isVisible,
      onDismiss: closePurchase.dismiss,
      onSubmit: () => void closePurchase.submit(),
      onTotalChange: closePurchase.onTotalChange,
      totalErrorMessage: closePurchase.totalErrorMessage,
      totalText: closePurchase.totalText,
    },
    detail,
    hasCheckedRows: checkedRows.length > 0,
    hasItems: rows.length > 0,
    hasNoSearchResults: search.hasNoResults,
    isAllChecked,
    // Con error de carga no se dice "tu lista está vacía": no se sabe si lo está.
    isEmpty: !state.isLoading && !state.loadErrorMessage && rows.length === 0,
    isLoading: state.isLoading || purchase.isLoadingSession,
    isSearching: search.isSearching,
    isUndoRemoveVisible: removal.undoItemId !== null,
    loadErrorMessage: state.loadErrorMessage,
    onCloseDetail,
    onDecreaseQuantity,
    onExitShoppingMode: purchase.exitShoppingMode,
    onIncreaseQuantity,
    onOpenDetail,
    onQueryChange: search.setQuery,
    onRemoveItem,
    onRequestClosePurchase: closePurchase.request,
    onSelectSearchOption,
    onStartPurchase: storePicker.open,
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
    sessionNoticeMessage: purchase.sessionNoticeMessage,
    storePicker: {
      errorMessage: storePicker.errorMessage,
      isLoading: storePicker.isLoadingStores,
      isOpen: storePicker.isOpen,
      isStarting: storePicker.isStarting,
      onClose: storePicker.close,
      onPickStore: (storeId: string) => void storePicker.pickStore(storeId),
      stores: storePicker.stores,
    },
  };
};

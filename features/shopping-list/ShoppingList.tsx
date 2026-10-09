"use client";

import { ProductSearch } from "@/components/product-search/ProductSearch";
import { Modal, Spinner } from "@/components/ui";
import { SHOPPING_LIST_TEXT } from "./constants/shopping-list.constants";
import { ShoppingListAllChecked } from "./components/ShoppingListAllChecked";
import { ShoppingListEmptyState } from "./components/ShoppingListEmptyState";
import { ShoppingListItemDetail } from "./components/ShoppingListItemDetail";
import { ShoppingListRow } from "./components/ShoppingListRow";
import { ShoppingListSection } from "./components/ShoppingListSection";
import { UndoToast } from "./components/UndoToast";
import { useShoppingListViewModel } from "./hooks/useShoppingListViewModel";
import type { ShoppingListRowViewModel } from "./models/ShoppingListRowViewModel.interface";

/**
 * Pantalla de la lista general. "use client" porque usa hooks y habla con
 * Supabase desde el navegador (la sesión anónima vive en el navegador).
 */
export const ShoppingList = (): React.JSX.Element => {
  const viewModel = useShoppingListViewModel();

  // Misma fila en las dos secciones; solo cambia en cuál se dibuja.
  const renderRow = (row: ShoppingListRowViewModel): React.JSX.Element => (
    <ShoppingListRow
      key={row.item.id}
      row={row}
      onDecrease={() => viewModel.onDecreaseQuantity(row.item.id)}
      onIncrease={() => viewModel.onIncreaseQuantity(row.item.id)}
      onOpenDetail={() => viewModel.onOpenDetail(row.item.id)}
      onRemove={() => viewModel.onRemoveItem(row.item.id)}
      onToggleChecked={() => viewModel.onToggleChecked(row.item.id)}
    />
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-tacha-bg px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{SHOPPING_LIST_TEXT.TITLE}</h1>

      {viewModel.canAddItems ? (
        <ProductSearch
          errorMessage={viewModel.searchErrorMessage}
          hasNoResults={viewModel.hasNoSearchResults}
          isSearching={viewModel.isSearching}
          onQueryChange={viewModel.onQueryChange}
          onSelectOption={viewModel.onSelectSearchOption}
          options={viewModel.searchOptions}
          query={viewModel.query}
        />
      ) : null}

      {viewModel.loadErrorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.loadErrorMessage}
        </p>
      ) : null}
      {viewModel.addErrorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.addErrorMessage}
        </p>
      ) : null}
      {viewModel.quantityErrorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.quantityErrorMessage}
        </p>
      ) : null}
      {viewModel.checkErrorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.checkErrorMessage}
        </p>
      ) : null}
      {viewModel.removeErrorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.removeErrorMessage}
        </p>
      ) : null}

      {viewModel.isLoading ? <Spinner /> : null}
      {viewModel.isEmpty ? <ShoppingListEmptyState /> : null}
      {viewModel.hasItems ? (
        <ShoppingListSection title={SHOPPING_LIST_TEXT.PENDING_SECTION}>
          {viewModel.isAllChecked ? <ShoppingListAllChecked /> : viewModel.pendingRows.map(renderRow)}
        </ShoppingListSection>
      ) : null}
      {viewModel.hasCheckedRows ? (
        <ShoppingListSection title={SHOPPING_LIST_TEXT.CHECKED_SECTION}>
          {viewModel.checkedRows.map(renderRow)}
        </ShoppingListSection>
      ) : null}

      {viewModel.isUndoRemoveVisible ? <UndoToast onUndo={viewModel.onUndoRemove} /> : null}

      <Modal isOpen={viewModel.detail !== null} onClose={viewModel.onCloseDetail} title={viewModel.detail?.productName}>
        {viewModel.detail ? <ShoppingListItemDetail detail={viewModel.detail} onClose={viewModel.onCloseDetail} /> : null}
      </Modal>
    </main>
  );
};

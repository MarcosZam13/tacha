"use client";

import { Spinner } from "@/components/ui";
import { SHOPPING_LIST_TEXT } from "./constants/shopping-list.constants";
import { ProductSearch } from "./components/ProductSearch";
import { ShoppingListEmptyState } from "./components/ShoppingListEmptyState";
import { ShoppingListRow } from "./components/ShoppingListRow";
import { useShoppingListViewModel } from "./hooks/useShoppingListViewModel";

/**
 * Pantalla de la lista general. "use client" porque usa hooks y habla con
 * Supabase desde el navegador (la sesión anónima vive en el navegador).
 */
export const ShoppingList = (): React.JSX.Element => {
  const viewModel = useShoppingListViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-tacha-bg px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{SHOPPING_LIST_TEXT.TITLE}</h1>

      {viewModel.canAddItems ? (
        <ProductSearch
          errorMessage={viewModel.searchErrorMessage}
          hasNoResults={viewModel.hasNoSearchResults}
          isSearching={viewModel.isSearching}
          onQueryChange={viewModel.onQueryChange}
          onSelectResult={viewModel.onSelectResult}
          query={viewModel.query}
          results={viewModel.searchResults}
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

      {viewModel.isLoading ? <Spinner /> : null}
      {viewModel.isEmpty ? <ShoppingListEmptyState /> : null}
      {viewModel.hasItems ? (
        <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-badge border border-tacha-border bg-tacha-surface">
          {viewModel.rows.map((row) => (
            <ShoppingListRow
              key={row.item.id}
              row={row}
              onDecrease={() => viewModel.onDecreaseQuantity(row.item.id)}
              onIncrease={() => viewModel.onIncreaseQuantity(row.item.id)}
            />
          ))}
        </ul>
      ) : null}
    </main>
  );
};

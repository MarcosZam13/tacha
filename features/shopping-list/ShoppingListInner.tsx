"use client";

import Link from "next/link";
import { AssigneeField } from "@/components/assignee-field/AssigneeField";
import { ASSIGNEE_LIST_SOURCE } from "@/components/assignee-field/constants/assignee-field.constants";
import { useListAssigneesViewModel } from "@/components/assignee-field/hooks/useListAssigneesViewModel";
import { ProductSearch } from "@/components/product-search/ProductSearch";
import { Button, Modal, Spinner } from "@/components/ui";
import { APP_ROUTE, BUTTON_VARIANT } from "@/constants";
import { InventorySuggestions } from "@/features/inventory-suggestions/InventorySuggestions";
import { PURCHASE_SESSION_TEXT } from "./constants/purchase-session.constants";
import { SHOPPING_LIST_TEXT } from "./constants/shopping-list.constants";
import { ClosePurchasePanel } from "./components/ClosePurchasePanel";
import { KeptPersonalListSection } from "./components/KeptPersonalListSection";
import { ShoppingListAllChecked } from "./components/ShoppingListAllChecked";
import { ShoppingListEmptyState } from "./components/ShoppingListEmptyState";
import { ShoppingListItemDetail } from "./components/ShoppingListItemDetail";
import { ShoppingListRow } from "./components/ShoppingListRow";
import { ShoppingListSection } from "./components/ShoppingListSection";
import { ShoppingModeBar } from "./components/ShoppingModeBar";
import { ShortfallResolutionPanel } from "./components/ShortfallResolutionPanel";
import { StorePicker } from "./components/StorePicker";
import { UndoToast } from "./components/UndoToast";
import { UndoResolutionDialog } from "./components/UndoResolutionDialog";
import { useShoppingListViewModel } from "./hooks/useShoppingListViewModel";
import type { ShoppingListRowViewModel } from "./models/ShoppingListRowViewModel.interface";

/**
 * Cuerpo de la pantalla de la lista general (Container/Inner: la frontera
 * Suspense está en ShoppingList.tsx). "use client" porque usa hooks y habla
 * con Supabase desde el navegador (la sesión anónima vive en el navegador).
 * En modo compra (SCRUM-67) es la misma lista con la barra arriba (CA-02).
 */
export const ShoppingListInner = (): React.JSX.Element => {
  const viewModel = useShoppingListViewModel();
  // El campo "Encargado" (SCRUM-108): solo se dibuja si la lista general lo tiene encendido en Configuración.
  const assignees = useListAssigneesViewModel({ kind: ASSIGNEE_LIST_SOURCE.GENERAL });

  // Misma fila en las dos secciones; solo cambia en cuál se dibuja.
  const renderRow = (row: ShoppingListRowViewModel): React.JSX.Element => (
    <ShoppingListRow
      key={row.item.id}
      assigneeSlot={<AssigneeField className="px-3 pb-2" itemId={row.item.id} viewModel={assignees} />}
      row={row}
      onDecrease={() => viewModel.onDecreaseQuantity(row.item.id)}
      onIncrease={() => viewModel.onIncreaseQuantity(row.item.id)}
      onOpenDetail={() => viewModel.onOpenDetail(row.item.id)}
      onRemove={() => viewModel.onRemoveItem(row.item.id)}
      onToggleChecked={() => viewModel.onToggleChecked(row.item.id)}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-tacha-text">{SHOPPING_LIST_TEXT.TITLE}</h1>
        {/* SCRUM-109 (HU-72 CA-01). Link y no Button: es navegación. */}
        <Link
          href={APP_ROUTE.LIST_GROUPS}
          className="rounded-tacha-badge border border-tacha-teal px-4 py-2 font-body text-sm font-semibold text-tacha-teal hover:bg-tacha-teal/10"
        >
          {SHOPPING_LIST_TEXT.MANAGE_GROUPS}
        </Link>
      </div>

      {viewModel.activeStoreName ? (
        <ShoppingModeBar
          storeName={viewModel.activeStoreName}
          onExit={viewModel.onExitShoppingMode}
          onFinish={viewModel.onRequestClosePurchase}
        />
      ) : null}

      {/* SCRUM-102 (HU-70 CA-01): debajo del encabezado (y de la barra del modo compra, que sigue primero) y antes de la lista. Si falla, no se dibuja (CA-03). */}
      {/* SCRUM-104: el ✓ agrega con el mismo addItem de la lista, así aparece en "Pendientes" sin recargar. */}
      <InventorySuggestions
        onConfirm={viewModel.onConfirmSuggestion}
        pendingVariantIds={viewModel.pendingVariantIds}
      />

      {viewModel.canStartPurchase ? (
        <div>
          <Button variant={BUTTON_VARIANT.PRIMARY} onClick={viewModel.onStartPurchase}>
            {PURCHASE_SESSION_TEXT.START}
          </Button>
        </div>
      ) : null}
      {viewModel.sessionNoticeMessage ? (
        <p role="status" className="font-body text-sm text-tacha-textsec">
          {viewModel.sessionNoticeMessage}
        </p>
      ) : null}
      {viewModel.shortfallNoticeMessage ? (
        <p role="status" className="font-body text-sm text-tacha-textsec">
          {viewModel.shortfallNoticeMessage}
        </p>
      ) : null}
      {viewModel.closePurchase.isVisible ? <ClosePurchasePanel panel={viewModel.closePurchase} /> : null}

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

      {/* SCRUM-59 (D4): la lista personal que se eligió mantener, aparte de la de la familia. */}
      {viewModel.keptPersonalRows.length > 0 ? <KeptPersonalListSection rows={viewModel.keptPersonalRows} /> : null}

      {viewModel.isUndoRemoveVisible ? <UndoToast onUndo={viewModel.onUndoRemove} /> : null}

      <Modal isOpen={viewModel.detail !== null} onClose={viewModel.onCloseDetail} title={viewModel.detail?.productName}>
        {viewModel.detail ? <ShoppingListItemDetail detail={viewModel.detail} onClose={viewModel.onCloseDetail} /> : null}
      </Modal>

      <Modal
        isOpen={viewModel.storePicker.isOpen}
        onClose={viewModel.storePicker.onClose}
        title={PURCHASE_SESSION_TEXT.PICK_STORE_TITLE}
      >
        <StorePicker picker={viewModel.storePicker} />
      </Modal>

      {/* SCRUM-115: "¿Qué hiciste?" al tachar con aviso, y la confirmación para deshacerlo al destachar. */}
      <ShortfallResolutionPanel panel={viewModel.shortfallPanel} />
      <UndoResolutionDialog dialog={viewModel.undoUncheck} />
    </div>
  );
};

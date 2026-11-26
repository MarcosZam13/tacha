import { useEffect, useId, useRef } from "react";
import { ProductSearch } from "@/components/product-search/ProductSearch";
import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { ShelfLifeChips } from "@/features/shopping-list/components/ShelfLifeChips";
import { MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";
import type { AddInventoryItemPanelProps } from "./models/AddInventoryItemPanelProps.interface";

/**
 * "+ Agregar a mi inventario" (SCRUM-107, HU-71d CA-01): el buscador del
 * catálogo (el mismo de la lista) y, al elegir un producto, los chips
 * opcionales de HU-70b y "Agregar". Al abrirse, el foco va al título del
 * panel, así el lector de pantalla dice dónde está.
 */
export const AddInventoryItemPanel = ({ addItem }: AddInventoryItemPanelProps): React.JSX.Element => {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    // role="group" y no <section>: una sección con nombre es una región, y las regiones de esta pantalla son los grupos por urgencia.
    <div
      role="group"
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-tacha-card border border-tacha-border bg-tacha-surface p-4"
    >
      <h2
        id={titleId}
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-lg font-semibold text-tacha-text focus:outline-none"
      >
        {MY_INVENTORY_TEXT.ADD_TITLE}
      </h2>

      {addItem.selected === null ? (
        <ProductSearch
          errorMessage={addItem.searchErrorMessage}
          hasNoResults={addItem.hasNoResults}
          isSearching={addItem.isSearching}
          onQueryChange={addItem.onQueryChange}
          onSelectOption={addItem.onSelectOption}
          options={addItem.options}
          query={addItem.query}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="font-body text-sm font-semibold text-tacha-text">{addItem.selected.productName}</span>
              <span className="font-body text-xs text-tacha-textsec">{addItem.selected.sizeLabel}</span>
            </div>
            <button
              type="button"
              onClick={addItem.changeProduct}
              disabled={addItem.isSaving}
              className="min-h-10 font-body text-xs font-semibold text-tacha-teal hover:underline disabled:opacity-50"
            >
              {MY_INVENTORY_TEXT.ADD_CHANGE_PRODUCT}
            </button>
          </div>
          {/* -mx-3: compensa el px-3 que ShelfLifeChips trae de la fila de la lista; así queda alineado con el panel. */}
          <div className="-mx-3">
            <ShelfLifeChips
              productName={addItem.selected.productName}
              chips={{
                // El error de agregar va abajo, junto a "Agregar".
                errorMessage: null,
                isSaving: addItem.isSaving,
                itemId: addItem.selected.variantId,
                onChoose: addItem.onChooseChip,
                selectedChoice: addItem.selectedChoice,
              }}
            />
          </div>
        </div>
      )}

      {addItem.errorMessage ? (
        <p role="alert" className="font-body text-xs text-tacha-danger">
          {addItem.errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {addItem.selected !== null ? (
          <Button onClick={addItem.submit} isDisabled={addItem.isSaving}>
            {MY_INVENTORY_TEXT.ADD_CONFIRM}
          </Button>
        ) : null}
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={addItem.cancel} isDisabled={addItem.isSaving}>
          {MY_INVENTORY_TEXT.ADD_CANCEL}
        </Button>
      </div>
    </div>
  );
};

import { useState } from "react";
import type { ProductSearchOption } from "@/components/product-search/models/ProductSearchOption.interface";
import type { ShelfLifeChoiceType } from "@/features/shopping-list/constants/shelf-life.constants";
import { useProductSearch } from "@/hooks/useProductSearch";
import type { NullableRef } from "@/types/nullable.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";
import type {
  AddInventoryItemViewModel,
  SelectedInventoryProduct,
} from "../models/AddInventoryItemViewModel.interface";
import { addInventoryItem } from "../services/my-inventory.service";

/**
 * "+ Agregar a mi inventario" (SCRUM-107, HU-71d CA-01): buscar un producto
 * del catálogo, elegir la presentación, el chip opcional de HU-70b y agregar.
 * Usa el buscador compartido (useProductSearch, catálogo global, como la
 * lista general). `onAdded` recibe lo agregado para que la pantalla vuelva a
 * pedir el inventario.
 */
export const useAddInventoryItem = (
  onAdded: (product: SelectedInventoryProduct) => void,
): AddInventoryItemViewModel => {
  const search = useProductSearch();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<NullableRef<SelectedInventoryProduct>>(null);
  const [selectedChoice, setSelectedChoice] = useState<NullableRef<ShelfLifeChoiceType>>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<NullableRef<string>>(null);

  // El buscador devuelve productos madre; al inventario se agrega una presentación.
  const products: SelectedInventoryProduct[] = search.results.flatMap((product) =>
    product.variants.map((variant) => ({
      productName: product.productName,
      sizeLabel: formatSizeLabel(variant.baseQuantity, variant.baseUnit),
      variantId: variant.variantId,
    })),
  );
  const options: ProductSearchOption[] = products.map((product) => ({
    detail: product.sizeLabel,
    id: product.variantId,
    label: product.productName,
  }));

  const reset = (): void => {
    search.clearQuery();
    setSelected(null);
    setSelectedChoice(null);
    setErrorMessage(null);
  };

  const open = (): void => {
    reset();
    setIsOpen(true);
  };

  const cancel = (): void => {
    reset();
    setIsOpen(false);
  };

  const onSelectOption = (variantId: string): void => {
    setSelected(products.find((product) => product.variantId === variantId) ?? null);
    setErrorMessage(null);
  };

  const changeProduct = (): void => {
    setSelected(null);
    setSelectedChoice(null);
    setErrorMessage(null);
  };

  const onChooseChip = (choice: ShelfLifeChoiceType): void => {
    setSelectedChoice((current) => (current === choice ? null : choice));
  };

  const submit = (): void => {
    if (selected === null || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    addInventoryItem(selected.variantId, selectedChoice)
      .then(() => {
        reset();
        setIsOpen(false);
        onAdded(selected);
      })
      .catch(() => setErrorMessage(MY_INVENTORY_TEXT.ADD_ERROR))
      .finally(() => setIsSaving(false));
  };

  return {
    cancel,
    changeProduct,
    errorMessage,
    hasNoResults: search.hasNoResults,
    isOpen,
    isSaving,
    isSearching: search.isSearching,
    onChooseChip,
    onQueryChange: search.setQuery,
    onSelectOption,
    open,
    options,
    query: search.query,
    searchErrorMessage: search.errorMessage,
    selected,
    selectedChoice,
    submit,
  };
};

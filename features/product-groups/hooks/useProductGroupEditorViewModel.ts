import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { APP_ROUTE, UNSAVED_CHANGES_SOURCE } from "@/constants";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useReportUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { searchCatalogIncludingOwn } from "@/services/catalog.service";
import { toCatalogSearchResults } from "@/utils/toCatalogSearchResults";
import {
  PRODUCT_GROUP_EDITOR_STATUS,
  PRODUCT_GROUP_QUANTITY_STEP,
  PRODUCT_GROUP_SHARE_VISIBILITY,
} from "../constants/product-group-editor.constants";
import type { ProductGroupEditorViewModel } from "../models/product-group-editor.interfaces";
import { toProductGroupItemRow } from "../utils/toProductGroupItemRow";
import { useProductGroupEditor } from "./useProductGroupEditor";

/**
 * Facade del editor de grupos (SCRUM-110): une el grupo en armado
 * (useProductGroupEditor), el buscador compartido y la navegación, y le
 * entrega a ProductGroupEditor.tsx exactamente lo que dibuja.
 */
export const useProductGroupEditorViewModel = (): ProductGroupEditorViewModel => {
  const router = useRouter();
  const editor = useProductGroupEditor();
  // También mis productos y los de mi familia (regla 5), no solo el catálogo global.
  const search = useProductSearch(searchCatalogIncludingOwn);
  const { announcement, errors, hasChanges, saveErrorMessage, status, values } = editor.state;

  // Cerrar sesión pide confirmación mientras haya un grupo sin guardar (regla 10).
  useReportUnsavedChanges(UNSAVED_CHANGES_SOURCE.PRODUCT_GROUP_EDITOR, hasChanges);

  // Una opción por presentación: lo que se guarda en el grupo es la variante.
  const searchResults = toCatalogSearchResults(search.results);

  const onSelectOption = (variantId: string): void => {
    const option = searchResults.find((result) => result.variantId === variantId);
    if (!option) return;
    search.clearQuery();
    editor.addItem(option);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // save maneja su propio error (lo pasa al estado); acá solo se navega si guardó.
    void editor.save().then((isSaved) => {
      if (isSaved) router.push(APP_ROUTE.LIST_GROUPS);
    });
  };

  return {
    announcement,
    isSaving: status === PRODUCT_GROUP_EDITOR_STATUS.SAVING,
    itemSearch: {
      errorMessage: search.errorMessage,
      hasNoResults: search.hasNoResults,
      isSearching: search.isSearching,
      onQueryChange: search.setQuery,
      onSelectOption,
      options: searchResults.map((result) => ({
        detail: result.sizeLabel,
        id: result.variantId,
        label: result.productName,
      })),
      query: search.query,
    },
    items: values.items.map(toProductGroupItemRow),
    itemsError: errors.items,
    name: values.name,
    nameError: errors.name,
    onDecreaseItem: (variantId) => editor.stepItemQuantity(variantId, PRODUCT_GROUP_QUANTITY_STEP.DECREASE),
    onIncreaseItem: (variantId) => editor.stepItemQuantity(variantId, PRODUCT_GROUP_QUANTITY_STEP.INCREASE),
    onNameChange: editor.changeName,
    onRemoveItem: editor.removeItem,
    onShareChange: editor.changeShare,
    onSubmit,
    saveErrorMessage,
    shareError: errors.share,
    shareWithHousehold: values.shareWithHousehold,
    showShareCheckbox: editor.shareVisibility === PRODUCT_GROUP_SHARE_VISIBILITY.VISIBLE,
  };
};

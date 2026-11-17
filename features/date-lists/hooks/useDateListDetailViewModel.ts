import { useCallback, useEffect, useState } from "react";
import type { ProductSearchOption } from "@/components/product-search/models/ProductSearchOption.interface";
import { ITEM_QUANTITY } from "@/constants/list-items.constants";
import type { ItemQuantityStepType } from "@/constants/list-items.constants";
import { useProductSearch } from "@/hooks/useProductSearch";
import { changeListItemQuantity } from "@/services/list-items.service";
import type { NullableRef } from "@/types/nullable.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { DATE_LIST_STATUS, DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateListDetail } from "../models/DateList.interface";
import {
  addItemToDateList,
  getDateListDetail,
  removeDateListItem,
  setDateListCancelled,
  setDateListItemChecked,
  setDateListTotal,
} from "../services/date-lists.service";
import { useDateListTotalEditor } from "./useDateListTotalEditor";
import type { DateListTotalEditor } from "./useDateListTotalEditor";

interface UseDateListDetailViewModelReturn {
  actionErrorMessage: NullableRef<string>;
  detail: NullableRef<DateListDetail>;
  hasNoSearchResults: boolean;
  isCancelConfirmOpen: boolean;
  isCancelled: boolean;
  isLoading: boolean;
  isNotFound: boolean;
  isSaving: boolean;
  isSearching: boolean;
  loadErrorMessage: NullableRef<string>;
  onConfirmCancel: () => void;
  onDecreaseQuantity: (itemId: string) => void;
  onDismissCancel: () => void;
  onIncreaseQuantity: (itemId: string) => void;
  onQueryChange: (query: string) => void;
  onReactivate: () => void;
  onRemoveItem: (itemId: string) => void;
  onRequestCancel: () => void;
  onSelectSearchOption: (variantId: string) => void;
  onToggleItem: (itemId: string, isChecked: boolean) => void;
  query: string;
  searchErrorMessage: NullableRef<string>;
  searchOptions: ProductSearchOption[];
  totalEditor: DateListTotalEditor;
}

/**
 * ViewModel de /fechas/[listId]. Después de cada cambio vuelve a leer la
 * sublista (SPEC plan §5). isSaving bloquea otro cambio mientras viaja el
 * anterior: así una respuesta vieja no pisa a una nueva.
 */
export const useDateListDetailViewModel = (listId: string): UseDateListDetailViewModelReturn => {
  const [detail, setDetail] = useState<NullableRef<DateListDetail>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<NullableRef<string>>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<NullableRef<string>>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const search = useProductSearch();

  useEffect(() => {
    let isCancelled = false;

    getDateListDetail(listId)
      .then((loadedDetail) => {
        if (!isCancelled) setDetail(loadedDetail);
      })
      .catch(() => {
        if (!isCancelled) setLoadErrorMessage(DATE_LIST_TEXT.DETAIL_LOAD_ERROR);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [listId]);

  // Hace el cambio y vuelve a leer la sublista. Responde si se guardó: el total (SCRUM-79) muestra su
  // error dentro de su campo, y el resto de las acciones, arriba de la lista (runChange).
  const applyChange = useCallback(
    async (change: () => Promise<unknown>): Promise<boolean> => {
      if (isSaving) return false;

      setIsSaving(true);
      setActionErrorMessage(null);
      try {
        await change();
        setDetail(await getDateListDetail(listId));
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, listId],
  );

  const runChange = useCallback(
    async (change: () => Promise<unknown>, errorMessage: string): Promise<void> => {
      // Con otro cambio en camino se ignora el toque, sin error: no falló nada.
      if (isSaving) return;

      const isSaved = await applyChange(change);
      if (!isSaved) setActionErrorMessage(errorMessage);
    },
    [applyChange, isSaving],
  );

  const totalEditor = useDateListTotalEditor((total) => applyChange(() => setDateListTotal(listId, total)));

  const changeQuantity = (itemId: string, quantityStep: ItemQuantityStepType): void => {
    void runChange(() => changeListItemQuantity(itemId, quantityStep), DATE_LIST_TEXT.QUANTITY_ERROR);
  };

  // El buscador devuelve productos madre; a la sublista se agrega la variante.
  const searchOptions: ProductSearchOption[] = search.results.flatMap((product) =>
    product.variants.map((variant) => ({
      detail: formatSizeLabel(variant.baseQuantity, variant.baseUnit),
      id: variant.variantId,
      label: product.productName,
    })),
  );

  return {
    actionErrorMessage,
    detail,
    hasNoSearchResults: search.hasNoResults,
    isCancelConfirmOpen,
    isCancelled: detail?.status === DATE_LIST_STATUS.CANCELLED,
    isLoading,
    isNotFound: !isLoading && !loadErrorMessage && detail === null,
    isSaving,
    isSearching: search.isSearching,
    loadErrorMessage,
    onConfirmCancel: () => {
      setIsCancelConfirmOpen(false);
      void runChange(() => setDateListCancelled(listId, true), DATE_LIST_TEXT.CANCEL_ERROR);
    },
    onDecreaseQuantity: (itemId) => changeQuantity(itemId, ITEM_QUANTITY.STEP.DECREASE),
    onDismissCancel: () => setIsCancelConfirmOpen(false),
    onIncreaseQuantity: (itemId) => changeQuantity(itemId, ITEM_QUANTITY.STEP.INCREASE),
    onQueryChange: search.setQuery,
    onReactivate: () => void runChange(() => setDateListCancelled(listId, false), DATE_LIST_TEXT.REACTIVATE_ERROR),
    onRemoveItem: (itemId) => void runChange(() => removeDateListItem(itemId), DATE_LIST_TEXT.REMOVE_ERROR),
    onRequestCancel: () => setIsCancelConfirmOpen(true),
    onSelectSearchOption: (variantId) => {
      search.clearQuery();
      void runChange(() => addItemToDateList(listId, variantId), DATE_LIST_TEXT.ADD_ERROR);
    },
    onToggleItem: (itemId, isChecked) =>
      void runChange(() => setDateListItemChecked(itemId, isChecked), DATE_LIST_TEXT.CHECK_ERROR),
    query: search.query,
    searchErrorMessage: search.errorMessage,
    searchOptions,
    totalEditor,
  };
};

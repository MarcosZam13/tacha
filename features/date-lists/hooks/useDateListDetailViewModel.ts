import { useCallback, useEffect, useState } from "react";
import type { ProductSearchOption } from "@/components/product-search/models/ProductSearchOption.interface";
import { ITEM_QUANTITY } from "@/constants/list-items.constants";
import type { ItemQuantityStepType } from "@/constants/list-items.constants";
import { useProductSearch } from "@/hooks/useProductSearch";
import { changeListItemQuantity } from "@/services/list-items.service";
import type { NullableRef } from "@/types/nullable.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateListDetail } from "../models/DateList.interface";
import { addItemToDateList, getDateListDetail, removeDateListItem } from "../services/date-lists.service";

interface UseDateListDetailViewModelReturn {
  actionErrorMessage: NullableRef<string>;
  detail: NullableRef<DateListDetail>;
  hasNoSearchResults: boolean;
  isLoading: boolean;
  isNotFound: boolean;
  isSaving: boolean;
  isSearching: boolean;
  loadErrorMessage: NullableRef<string>;
  onDecreaseQuantity: (itemId: string) => void;
  onIncreaseQuantity: (itemId: string) => void;
  onQueryChange: (query: string) => void;
  onRemoveItem: (itemId: string) => void;
  onSelectSearchOption: (variantId: string) => void;
  query: string;
  searchErrorMessage: NullableRef<string>;
  searchOptions: ProductSearchOption[];
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

  const runChange = useCallback(
    async (change: () => Promise<unknown>, errorMessage: string): Promise<void> => {
      if (isSaving) return;

      setIsSaving(true);
      setActionErrorMessage(null);
      try {
        await change();
        setDetail(await getDateListDetail(listId));
      } catch {
        setActionErrorMessage(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, listId],
  );

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
    isLoading,
    isNotFound: !isLoading && !loadErrorMessage && detail === null,
    isSaving,
    isSearching: search.isSearching,
    loadErrorMessage,
    onDecreaseQuantity: (itemId) => changeQuantity(itemId, ITEM_QUANTITY.STEP.DECREASE),
    onIncreaseQuantity: (itemId) => changeQuantity(itemId, ITEM_QUANTITY.STEP.INCREASE),
    onQueryChange: search.setQuery,
    onRemoveItem: (itemId) => void runChange(() => removeDateListItem(itemId), DATE_LIST_TEXT.REMOVE_ERROR),
    onSelectSearchOption: (variantId) => {
      search.clearQuery();
      void runChange(() => addItemToDateList(listId, variantId), DATE_LIST_TEXT.ADD_ERROR);
    },
    query: search.query,
    searchErrorMessage: search.errorMessage,
    searchOptions,
  };
};

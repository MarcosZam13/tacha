import { CATALOG_SEARCH_STATUS } from "../constants/catalog-search.constants";
import type { CatalogSearchStatusType } from "../constants/catalog-search.constants";

interface CatalogSearchSignals {
  hasError: boolean;
  hasNoResults: boolean;
  hasResults: boolean;
  isSearching: boolean;
}

/**
 * Una sola respuesta a "¿qué se dibuja?". El orden importa: el error va
 * primero porque con error no se dice "sin resultados" (no se sabe si es
 * cierto); si no hay nada de lo anterior, el usuario todavía no escribió lo
 * suficiente y la pantalla está en reposo.
 */
export const getCatalogSearchStatus = ({
  hasError,
  hasNoResults,
  hasResults,
  isSearching,
}: CatalogSearchSignals): CatalogSearchStatusType => {
  if (hasError) return CATALOG_SEARCH_STATUS.ERROR;
  if (isSearching) return CATALOG_SEARCH_STATUS.LOADING;
  if (hasNoResults) return CATALOG_SEARCH_STATUS.EMPTY;
  if (hasResults) return CATALOG_SEARCH_STATUS.READY;
  return CATALOG_SEARCH_STATUS.IDLE;
};

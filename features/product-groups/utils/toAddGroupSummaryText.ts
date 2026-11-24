import { PRODUCT_GROUP_ADD_TO_LIST_TEXT, PRODUCT_GROUP_COUNT_LABEL } from "../constants/product-groups.constants";
import type { AddGroupToListResponse } from "../models/product-group-list-addition.interfaces";

/**
 * Las líneas del resumen después de agregar un grupo a la lista:
 * "Agregamos 3 productos de «Desayuno» a tu lista." y, si hubo, cuáles no se
 * agregaron porque ya no están disponibles.
 */
export const toAddGroupSummaryText = (groupName: string, response: AddGroupToListResponse): string[] => {
  const addedCount = response.added.length;
  const addedLine =
    addedCount === 0
      ? PRODUCT_GROUP_ADD_TO_LIST_TEXT.NONE_ADDED
      : `${PRODUCT_GROUP_ADD_TO_LIST_TEXT.ADDED_PREFIX}${addedCount} ${
          addedCount === 1 ? PRODUCT_GROUP_COUNT_LABEL.SINGULAR : PRODUCT_GROUP_COUNT_LABEL.PLURAL
        }${PRODUCT_GROUP_ADD_TO_LIST_TEXT.ADDED_GROUP_PREFIX}${groupName}${PRODUCT_GROUP_ADD_TO_LIST_TEXT.ADDED_SUFFIX}`;

  if (response.skipped.length === 0) return [addedLine];

  const skippedLine = `${PRODUCT_GROUP_ADD_TO_LIST_TEXT.SKIPPED_PREFIX}${response.skipped.join(
    PRODUCT_GROUP_ADD_TO_LIST_TEXT.SKIPPED_SEPARATOR,
  )}${PRODUCT_GROUP_ADD_TO_LIST_TEXT.SKIPPED_SUFFIX}`;
  return [addedLine, skippedLine];
};

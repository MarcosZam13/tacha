import type { PRODUCT_GROUP_LIST_ADDITION_STATUS } from "../constants/product-groups.constants";
import type { AddGroupToListResponse } from "./product-group-list-addition.interfaces";

/** El grupo que se está agregando: el id para la base y el nombre para el resumen. */
export interface ProductGroupListAdditionTarget {
  id: string;
  name: string;
}

/**
 * Unión discriminada por `status`: fuera de `idle` siempre hay un grupo, solo
 * `added` tiene respuesta y solo `failed` tiene mensaje de error.
 */
export type ProductGroupListAdditionState =
  | { status: typeof PRODUCT_GROUP_LIST_ADDITION_STATUS.IDLE }
  | { status: typeof PRODUCT_GROUP_LIST_ADDITION_STATUS.ADDING; group: ProductGroupListAdditionTarget }
  | {
      status: typeof PRODUCT_GROUP_LIST_ADDITION_STATUS.ADDED;
      group: ProductGroupListAdditionTarget;
      response: AddGroupToListResponse;
    }
  | {
      status: typeof PRODUCT_GROUP_LIST_ADDITION_STATUS.FAILED;
      group: ProductGroupListAdditionTarget;
      errorMessage: string;
    };

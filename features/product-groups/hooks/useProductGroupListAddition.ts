import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  PRODUCT_GROUP_ADD_TO_LIST_TEXT,
  PRODUCT_GROUP_LIST_ADDITION_STATUS,
} from "../constants/product-groups.constants";
import type {
  ProductGroupAddToListFeedback,
  ProductGroupCardAddToList,
  ProductGroupListAdditionViewModel,
} from "../models/product-group-list-addition.interfaces";
import type {
  ProductGroupListAdditionState,
  ProductGroupListAdditionTarget,
} from "../models/product-group-list-addition.types";
import { addGroupToList } from "../services/product-groups.service";
import { toAddGroupSummaryText } from "../utils/toAddGroupSummaryText";

const IDLE_STATE: ProductGroupListAdditionState = { status: PRODUCT_GROUP_LIST_ADDITION_STATUS.IDLE };

/**
 * Agregar un grupo a la lista (SCRUM-111): llamar a la base y dejar el
 * resumen o el error para la tarjeta de ese grupo. Mismo patrón que
 * useRecipeListAddition, sin el diálogo de repetir: agregar un grupo dos veces
 * suma las cantidades, que es lo que pide CA-02.
 *
 * `onGroupMissing` lo llama la pantalla para recargar si el grupo ya no existe
 * (lo borró otro miembro de la familia).
 */
export const useProductGroupListAddition = (onGroupMissing: () => void): ProductGroupListAdditionViewModel => {
  const [state, setState] = useState<ProductGroupListAdditionState>(IDLE_STATE);
  const isAdding = state.status === PRODUCT_GROUP_LIST_ADDITION_STATUS.ADDING;

  const addGroup = async (group: ProductGroupListAdditionTarget): Promise<void> => {
    setState({ group, status: PRODUCT_GROUP_LIST_ADDITION_STATUS.ADDING });
    try {
      const response = await addGroupToList(group.id);
      if (!response) {
        setState({
          errorMessage: PRODUCT_GROUP_ADD_TO_LIST_TEXT.NOT_FOUND,
          group,
          status: PRODUCT_GROUP_LIST_ADDITION_STATUS.FAILED,
        });
        onGroupMissing();
        return;
      }
      setState({ group, response, status: PRODUCT_GROUP_LIST_ADDITION_STATUS.ADDED });
    } catch {
      // La RPC es todo o nada: si falló, la lista quedó como estaba.
      setState({ errorMessage: PRODUCT_GROUP_ADD_TO_LIST_TEXT.ERROR, group, status: PRODUCT_GROUP_LIST_ADDITION_STATUS.FAILED });
    }
  };

  const onAddToList = (group: ProductGroupListAdditionTarget): void => {
    // Un grupo a la vez, y un doble clic no manda dos veces.
    if (isAdding) return;
    void addGroup(group);
  };

  const getFeedback = (): NullableRef<ProductGroupAddToListFeedback> => {
    if (state.status === PRODUCT_GROUP_LIST_ADDITION_STATUS.ADDED) {
      return { groupId: state.group.id, isError: false, messages: toAddGroupSummaryText(state.group.name, state.response) };
    }
    if (state.status === PRODUCT_GROUP_LIST_ADDITION_STATUS.FAILED) {
      return { groupId: state.group.id, isError: true, messages: [state.errorMessage] };
    }
    return null;
  };

  // Se calculan una vez por render y cada tarjeta se queda con lo suyo.
  const feedback = getFeedback();
  const addingGroupId = isAdding ? state.group.id : null;

  const getGroupAddToList = (groupId: string): ProductGroupCardAddToList => ({
    feedback: feedback?.groupId === groupId ? feedback : null,
    isAdding: addingGroupId === groupId,
    isDisabled: isAdding,
  });

  return { getGroupAddToList, onAddToList };
};

import { useEffect, useReducer, useState } from "react";
import { hasHousehold } from "@/services/personal-product.service";
import {
  PRODUCT_GROUP_EDITOR_ACTION,
  PRODUCT_GROUP_EDITOR_STATUS,
  PRODUCT_GROUP_SHARE_VISIBILITY,
} from "../constants/product-group-editor.constants";
import type { ProductGroupShareVisibilityType } from "../constants/product-group-editor.constants";
import type { UseProductGroupEditorReturn } from "../models/product-group-editor.interfaces";
import { createProductGroup } from "../services/product-groups.service";
import { createInitialProductGroupEditorState, productGroupEditorReducer } from "../utils/product-group-editor.reducer";
import { hasProductGroupFormErrors, validateProductGroupForm } from "../utils/validateProductGroupForm";

/**
 * Estado del editor de grupos (SCRUM-110): el reducer del grupo en armado, si
 * se muestra la casilla de compartir y el guardado. Mismo patrón que
 * useRecipeEditor: una función por cambio, cada una es una acción del reducer.
 */
export const useProductGroupEditor = (): UseProductGroupEditorReturn => {
  const [state, dispatch] = useReducer(productGroupEditorReducer, undefined, createInitialProductGroupEditorState);
  const [shareVisibility, setShareVisibility] = useState<ProductGroupShareVisibilityType>(
    PRODUCT_GROUP_SHARE_VISIBILITY.LOADING,
  );

  // CA-03: la casilla solo existe si el usuario tiene familia. Si no se puede
  // saber, no se muestra: el grupo queda personal, que es el valor seguro.
  useEffect(() => {
    let isCancelled = false;

    hasHousehold()
      .then((isMember) => {
        if (!isCancelled) {
          setShareVisibility(isMember ? PRODUCT_GROUP_SHARE_VISIBILITY.VISIBLE : PRODUCT_GROUP_SHARE_VISIBILITY.HIDDEN);
        }
      })
      .catch(() => {
        if (!isCancelled) setShareVisibility(PRODUCT_GROUP_SHARE_VISIBILITY.HIDDEN);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const save = async (): Promise<boolean> => {
    // Doble clic: mientras guarda no se manda otra vez.
    if (state.status === PRODUCT_GROUP_EDITOR_STATUS.SAVING) return false;

    const errors = validateProductGroupForm(state.values);
    if (hasProductGroupFormErrors(errors)) {
      dispatch({ errors, type: PRODUCT_GROUP_EDITOR_ACTION.VALIDATION_FAILED });
      return false;
    }

    dispatch({ type: PRODUCT_GROUP_EDITOR_ACTION.SAVE_STARTED });
    try {
      await createProductGroup(state.values);
      // Queda en SAVING a propósito: el ViewModel navega a "Mis grupos" y la
      // pantalla se desmonta, lo que también retira el aviso de cambios sin guardar.
      return true;
    } catch {
      // Nunca el mensaje crudo de la base: el genérico, con todo lo escrito intacto.
      dispatch({ type: PRODUCT_GROUP_EDITOR_ACTION.SAVE_FAILED });
      return false;
    }
  };

  return {
    addItem: (option) => dispatch({ option, type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_ADDED }),
    changeName: (name) => dispatch({ name, type: PRODUCT_GROUP_EDITOR_ACTION.NAME_CHANGED }),
    changeShare: (shareWithHousehold) =>
      dispatch({ shareWithHousehold, type: PRODUCT_GROUP_EDITOR_ACTION.SHARE_CHANGED }),
    removeItem: (variantId) => dispatch({ type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_REMOVED, variantId }),
    save,
    shareVisibility,
    state,
    stepItemQuantity: (variantId, step) =>
      dispatch({ step, type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_QUANTITY_STEPPED, variantId }),
  };
};

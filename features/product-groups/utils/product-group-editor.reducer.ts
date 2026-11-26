import type { CatalogSearchResult } from "@/types/catalog.types";
import {
  PRODUCT_GROUP_EDITOR_ACTION,
  PRODUCT_GROUP_EDITOR_STATUS,
  PRODUCT_GROUP_EDITOR_TEXT,
  PRODUCT_GROUP_LIMIT,
} from "../constants/product-group-editor.constants";
import type { ProductGroupEditorItem, ProductGroupEditorState } from "../models/product-group-editor.interfaces";
import type { ProductGroupEditorAction } from "../models/product-group-editor.types";
import { toProductGroupItemLabel } from "./toProductGroupItemLabel";

/** Un grupo nuevo arranca vacío y personal (CA-03). */
export const createInitialProductGroupEditorState = (): ProductGroupEditorState => ({
  announcement: null,
  errors: {},
  hasChanges: false,
  saveErrorMessage: null,
  status: PRODUCT_GROUP_EDITOR_STATUS.EDITING,
  values: { items: [], name: "", shareWithHousehold: false },
});

const clampQuantity = (quantity: number): number =>
  Math.min(PRODUCT_GROUP_LIMIT.QUANTITY_MAX, Math.max(PRODUCT_GROUP_LIMIT.QUANTITY_MIN, quantity));

const toEditorItem = (option: CatalogSearchResult): ProductGroupEditorItem => ({
  isPersonal: option.isPersonal ?? false,
  productName: option.productName,
  quantity: PRODUCT_GROUP_LIMIT.QUANTITY_MIN,
  sizeLabel: option.sizeLabel,
  variantId: option.variantId,
});

// Elegir una presentación: si ya está, le suma 1 (sin pasar del tope); si no,
// agrega una fila con cantidad 1, salvo que el grupo ya tenga el máximo.
const addItem = (state: ProductGroupEditorState, option: CatalogSearchResult): ProductGroupEditorState => {
  const label = toProductGroupItemLabel(option);
  const existingItem = state.values.items.find((item) => item.variantId === option.variantId);

  if (existingItem) {
    return {
      ...state,
      announcement: `${PRODUCT_GROUP_EDITOR_TEXT.ITEM_INCREASED_PREFIX}${label}`,
      hasChanges: true,
      values: {
        ...state.values,
        items: state.values.items.map((item) =>
          item.variantId === option.variantId ? { ...item, quantity: clampQuantity(item.quantity + 1) } : item,
        ),
      },
    };
  }

  if (state.values.items.length >= PRODUCT_GROUP_LIMIT.ITEMS_MAX) {
    return { ...state, announcement: PRODUCT_GROUP_EDITOR_TEXT.ITEMS_LIMIT_REACHED };
  }

  return {
    ...state,
    announcement: `${PRODUCT_GROUP_EDITOR_TEXT.ITEM_ADDED_PREFIX}${label}`,
    // Agregar un producto resuelve "Agrega al menos uno"; el de compartir se
    // vuelve a revisar al guardar.
    errors: { ...state.errors, items: undefined, share: undefined },
    hasChanges: true,
    values: { ...state.values, items: [...state.values.items, toEditorItem(option)] },
  };
};

/**
 * Función pura: mismo estado + misma acción = mismo resultado, sin red ni
 * React (mismo patrón que recipe-editor.reducer.ts). Todas las reglas de cómo
 * cambia el grupo en armado viven acá: no se duplica una presentación, la
 * cantidad no sale de 1-99 y cambiar un campo limpia solo el error de ese
 * campo.
 */
export const productGroupEditorReducer = (
  state: ProductGroupEditorState,
  action: ProductGroupEditorAction,
): ProductGroupEditorState => {
  switch (action.type) {
    case PRODUCT_GROUP_EDITOR_ACTION.NAME_CHANGED:
      return {
        ...state,
        errors: { ...state.errors, name: undefined },
        hasChanges: true,
        values: { ...state.values, name: action.name },
      };

    case PRODUCT_GROUP_EDITOR_ACTION.ITEM_ADDED:
      return addItem(state, action.option);

    case PRODUCT_GROUP_EDITOR_ACTION.ITEM_QUANTITY_STEPPED:
      return {
        ...state,
        hasChanges: true,
        values: {
          ...state.values,
          items: state.values.items.map((item) =>
            item.variantId === action.variantId ? { ...item, quantity: clampQuantity(item.quantity + action.step) } : item,
          ),
        },
      };

    case PRODUCT_GROUP_EDITOR_ACTION.ITEM_REMOVED: {
      const removedItem = state.values.items.find((item) => item.variantId === action.variantId);
      if (!removedItem) return state;

      return {
        ...state,
        announcement: `${PRODUCT_GROUP_EDITOR_TEXT.ITEM_REMOVED_PREFIX}${toProductGroupItemLabel(removedItem)}`,
        // Quitar un producto personal puede resolver el error de compartir.
        errors: { ...state.errors, share: undefined },
        hasChanges: true,
        values: {
          ...state.values,
          items: state.values.items.filter((item) => item.variantId !== action.variantId),
        },
      };
    }

    case PRODUCT_GROUP_EDITOR_ACTION.SHARE_CHANGED:
      return {
        ...state,
        errors: { ...state.errors, share: undefined },
        hasChanges: true,
        values: { ...state.values, shareWithHousehold: action.shareWithHousehold },
      };

    case PRODUCT_GROUP_EDITOR_ACTION.VALIDATION_FAILED:
      return { ...state, errors: action.errors };

    case PRODUCT_GROUP_EDITOR_ACTION.SAVE_STARTED:
      return { ...state, saveErrorMessage: null, status: PRODUCT_GROUP_EDITOR_STATUS.SAVING };

    // Se conserva todo lo escrito para reintentar (SPEC §7).
    case PRODUCT_GROUP_EDITOR_ACTION.SAVE_FAILED:
      return {
        ...state,
        saveErrorMessage: PRODUCT_GROUP_EDITOR_TEXT.SAVE_ERROR,
        status: PRODUCT_GROUP_EDITOR_STATUS.ERROR,
      };

    default:
      return state;
  }
};

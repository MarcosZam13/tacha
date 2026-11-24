import type { CatalogSearchResult } from "@/types/catalog.types";
import type {
  PRODUCT_GROUP_EDITOR_ACTION,
  ProductGroupQuantityStepType,
} from "../constants/product-group-editor.constants";
import type { ProductGroupEditorErrors } from "./product-group-editor.interfaces";

/**
 * Acciones del editor de grupos (SCRUM-110). Unión discriminada por `type`:
 * en cada `case` del reducer TypeScript sabe qué otros campos trae la acción.
 */
export type ProductGroupEditorAction =
  | { type: typeof PRODUCT_GROUP_EDITOR_ACTION.ITEM_ADDED; option: CatalogSearchResult }
  | {
      type: typeof PRODUCT_GROUP_EDITOR_ACTION.ITEM_QUANTITY_STEPPED;
      step: ProductGroupQuantityStepType;
      variantId: string;
    }
  | { type: typeof PRODUCT_GROUP_EDITOR_ACTION.ITEM_REMOVED; variantId: string }
  | { type: typeof PRODUCT_GROUP_EDITOR_ACTION.NAME_CHANGED; name: string }
  | { type: typeof PRODUCT_GROUP_EDITOR_ACTION.SAVE_FAILED }
  | { type: typeof PRODUCT_GROUP_EDITOR_ACTION.SAVE_STARTED }
  | { type: typeof PRODUCT_GROUP_EDITOR_ACTION.SHARE_CHANGED; shareWithHousehold: boolean }
  | { type: typeof PRODUCT_GROUP_EDITOR_ACTION.VALIDATION_FAILED; errors: ProductGroupEditorErrors };
